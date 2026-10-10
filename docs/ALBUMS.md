# 相册接入 Supabase 配置指南

相册数据存在 Supabase，**只有你能上传**（需要邮箱密码登录），访客只能看。
相册页在客户端拉取，所以**上传后刷新即可见，不需要等站点重新构建**。

上传时会自动生成缩略图（默认宽 800px 的 JPEG），列表用缩略图、点开看原图 ——
手机直出的大图不压缩会很卡。

---

## 权限模型

| | 匿名 | 登录后 |
| --- | --- | --- |
| 看相册 | ✅ | ✅ |
| 建相册 / 传图 / 改描述 / 删除 | ❌ | ✅ |

与日记一致。匿名访客连上传接口都调不通，靠的是数据库行级安全策略，
不是前端限制。

---

## 第 1 步：复用已有的 Supabase 项目

如果你已经配好了留言板或日记，**直接用同一个项目**，跳过创建。
`.env` 里的 `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` 也是共用的。

---

## 第 2 步：建两张表和权限策略

SQL Editor 里执行：

```sql
-- ─────────────────────────────────────────────
-- 相册表
-- ─────────────────────────────────────────────
create table if not exists public.album_groups (
  id          bigint generated always as identity primary key,
  title       text        not null,
  description text        not null default '',
  location    text        not null default '',
  date        date,
  cover       text,
  created_at  timestamptz not null default now(),

  constraint album_title_length check (char_length(title) between 1 and 60)
);

create index if not exists album_groups_created_at_idx
  on public.album_groups (created_at desc);

-- ─────────────────────────────────────────────
-- 照片表
-- ─────────────────────────────────────────────
create table if not exists public.album_photos (
  id          bigint generated always as identity primary key,
  album_id    bigint      not null references public.album_groups(id) on delete cascade,
  src         text        not null,
  thumbnail   text        not null,
  title       text        not null default '',
  description text        not null default '',
  created_at  timestamptz not null default now(),

  constraint photo_title_length check (char_length(title) <= 100),
  constraint photo_desc_length  check (char_length(description) <= 500)
);

create index if not exists album_photos_album_id_idx
  on public.album_photos (album_id, created_at);

-- ─────────────────────────────────────────────
-- 行级安全：匿名只读，登录用户可写
-- ─────────────────────────────────────────────
alter table public.album_groups enable row level security;
alter table public.album_photos enable row level security;

-- 任何人都能看
drop policy if exists "album_groups_public_read" on public.album_groups;
create policy "album_groups_public_read"
  on public.album_groups for select to anon, authenticated using (true);

drop policy if exists "album_photos_public_read" on public.album_photos;
create policy "album_photos_public_read"
  on public.album_photos for select to anon, authenticated using (true);

-- 只有登录用户能改。注意角色是 authenticated，
-- 匿名访客不在这条策略范围内，会被直接拒绝。
drop policy if exists "album_groups_auth_write" on public.album_groups;
create policy "album_groups_auth_write"
  on public.album_groups for all to authenticated using (true) with check (true);

drop policy if exists "album_photos_auth_write" on public.album_photos;
create policy "album_photos_auth_write"
  on public.album_photos for all to authenticated using (true) with check (true);
```

> `for all` 一条就覆盖了 insert / update / delete，因为只有你能登录，
> 不需要按「是谁写的」再细分。

> **`on delete cascade`** 让删除相册时自动删掉它的照片记录。
> 但**存储桶里的图片文件不会自动删** —— 见文末说明。

---

## 第 3 步：建图片存储桶

1. **Storage → New bucket**
2. Name 填 **`albums`**（必须完全一致）
3. **勾选 Public bucket**
4. **File size limit** 填 `20` MB（手机原图可能 5~10MB）
5. **Allowed MIME types** 填 `image/jpeg,image/png,image/webp,image/gif`

然后回 SQL Editor 执行：

```sql
-- 只有登录用户能上传
drop policy if exists "albums_image_insert" on storage.objects;
create policy "albums_image_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'albums');

-- 公开可读
drop policy if exists "albums_image_read" on storage.objects;
create policy "albums_image_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'albums');

-- ⚠️ 再给登录用户一条 SELECT 策略。Storage API 插入后会执行
-- RETURNING * 取回文件元数据，这一步走的是 SELECT 策略，
-- 缺了会报「new row violates row-level security policy」—— 错误信息会误导你
-- 去查 INSERT 策略。详见 GUESTBOOK.md 里的同类说明。
drop policy if exists "albums_image_returning" on storage.objects;
create policy "albums_image_returning"
  on storage.objects for select to authenticated
  using (bucket_id = 'albums');

-- 表级权限兜底
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
```

---

## 第 4 步：确认登录账号

如果日记已经能用，**这一步已经完成了**，跳过。

否则见 [docs/DIARY.md](DIARY.md) 第 4 步：创建一个带 Auto Confirm 的账号，
并**务必关掉开放注册**（Authentication → Sign In / Providers → Email →
关闭 Allow new users to sign up）。

---

## 第 5 步：开始用

打开 **`/admin/albums/`**，登录后：

1. **左栏建相册** —— 填相册名（必填）、描述、地点、日期
2. **右上选相册 → 点虚线框选照片** —— 可一次选多张
3. 上传时自动压缩缩略图，进度条会显示「生成缩略图 → 上传」
4. 传完后每张照片可以改**标题**和**描述**，或**设为封面**、**删除**

**封面规则**：如果不手动设置，相册列表会自动用第一张照片的缩略图当封面。

**刷新 `/albums/` 即可看到**，不需要重新构建站点。

---

## 缩略图说明

上传前在浏览器里用 canvas 压缩，**只做等比缩放，不裁剪**（保留原始构图，
瀑布流布局依赖真实宽高比）。

配置在 `src/config/albumsSupabaseConfig.ts`：

```ts
thumbnailWidth: 800,      // 目标宽度，高度按比例
thumbnailQuality: 0.82,   // JPEG 压缩质量
```

- 原图本身就比目标宽度小**且是 JPEG** 时，直接复用原文件，不做无意义的重新编码
- 缩略图生成失败会自动退回上传原图，不阻断流程
- 每张照片在存储桶里占**两个文件**：`thumb-*.jpg` 和 `photo-*.<ext>`

---

## 与旧的本地相册模式的关系

`public/images/albums/` 的本地扫描模式**保留**：

- 构建时扫描到的本地相册会先渲染出来，作为首屏内容
- Supabase 数据拉取成功后**整体替换**掉

所以两边可以共存。你现在 `public/images/albums/` 下只有 README，是空的。

---

## 常见问题

**相册页一直显示「加载中」**

打开控制台看报错。常见原因：
- `.env` 没配，或改了没重启 dev server
- **浏览器地址栏的端口不对** —— 多个 dev server 同时跑时，
  Vite 会自动换端口（3001、3002…），不同实例的环境变量可能不一致

**上传报 `new row violates row-level security policy`**

**先别怀疑 INSERT 策略** —— Supabase Storage 插入后会 `RETURNING *`，
这一步走 SELECT 策略。确认第 3 步的 `albums_image_returning` 建好了。

**上传很慢**

原图是大图时正常。如果慢到不可接受，把 `thumbnailWidth` 调小
（缩略图本身传得很快，慢的是原图）。也可以把存储桶的 size limit 调小。

**删了相册，存储桶里的图片还在**

这是**预期行为**：`on delete cascade` 只删数据库记录，不会删存储对象。
存储桶里的文件需要你在 Supabase 的 Storage 页面手动清理。

如果想自动化，可以给 `album_photos` 建一个删除触发器调用
`storage.delete_object()`，但要在数据库里存 bucket 和路径 ——
目前没做，因为手动清理的频率很低。

**部署到线上后管理页登录不上 / 相册加载失败**

`.env` 里的变量需要在**构建时**注入。记得在托管平台（如 EdgeOne）
的环境变量设置里也加上 `PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`
和 `PUBLIC_TURNSTILE_SITE_KEY`。
