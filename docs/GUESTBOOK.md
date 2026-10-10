# 留言板配置指南

留言数据保存在 **Supabase**（数据库 + 图片对象存储），前端直接调用它的 API。
本站仍然是纯静态站，不需要自己的服务端。

**在全部配置完成前，请保持 `src/config/guestbookConfig.ts` 里的 `enable: false`**，
否则页面会生成但加载不出留言。

---

## 第 1 步：创建 Supabase 项目

1. 打开 https://supabase.com 注册（可用 GitHub 登录）
2. New project → 填项目名、数据库密码、选一个离你近的区域（比如 Singapore）
3. 等 1~2 分钟初始化完成

然后在 **Project Settings → API** 里记下两个值：

| 名称 | 用途 | 是否保密 |
| --- | --- | --- |
| Project URL | 项目地址 | 公开 |
| `anon` `public` key | 前端调用凭证 | **公开**（这是设计如此） |

> ⚠️ **`service_role` key 绝对不要碰。** 它绕过所有权限策略，
> 只要出现在前端或仓库里，等于把整个数据库的读写删权限交出去。

---

## 第 2 步：建表并配置权限

打开 **SQL Editor**，新建查询，把下面整段贴进去执行。

```sql
-- ─────────────────────────────────────────────
-- 1. 留言表
-- ─────────────────────────────────────────────
create table if not exists public.guestbook_messages (
  id          bigint generated always as identity primary key,
  name        text        not null,
  content     text        not null,
  image_url   text,
  created_at  timestamptz not null default now(),

  -- 数据库层面也做长度限制：前端校验可以被绕过，这里不能
  constraint name_length    check (char_length(name)    between 1 and 32),
  constraint content_length check (char_length(content) between 1 and 500)
);

-- 按时间倒序查列表，加个索引
create index if not exists guestbook_messages_created_at_idx
  on public.guestbook_messages (created_at desc);

-- ─────────────────────────────────────────────
-- 2. 开启行级安全（RLS）
-- ─────────────────────────────────────────────
alter table public.guestbook_messages enable row level security;

-- 任何人都能读留言
drop policy if exists "guestbook_public_read" on public.guestbook_messages;
create policy "guestbook_public_read"
  on public.guestbook_messages
  for select
  to anon, authenticated
  using (true);

-- 任何人都能写留言
drop policy if exists "guestbook_public_insert" on public.guestbook_messages;
create policy "guestbook_public_insert"
  on public.guestbook_messages
  for insert
  to anon, authenticated
  with check (true);

-- 注意：这里"没有"update 和 delete 策略。
-- RLS 开启后，没写策略的操作默认全部拒绝，
-- 所以匿名访客只能读和新增，改不了也删不掉别人的留言。
-- 你自己要删留言时，在 Supabase 的 Table Editor 里手动删即可。
```

---

## 第 3 步：建图片存储桶

1. 左侧 **Storage → New bucket**
2. Name 填 `guestbook`
3. **勾选 Public bucket**（留言图片要能公网访问）
4. 建议顺手设置限制：**File size limit** 填 `2` MB，
   **Allowed MIME types** 填 `image/jpeg,image/png,image/webp,image/gif`

然后回到 **SQL Editor**，再执行下面这段，让匿名访客可以上传图片：

```sql
-- 允许匿名访客往 guestbook 桶上传
drop policy if exists "guestbook_image_upload" on storage.objects;
create policy "guestbook_image_upload"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'guestbook');

-- 允许公开读取（桶是 public，但策略仍要写）
drop policy if exists "guestbook_image_read" on storage.objects;
create policy "guestbook_image_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'guestbook');
```

> **为什么不在前端校验就够了**：前端的大小/类型校验可以被绕过。
> 真正兜底的是这里桶上的 `File size limit` 和 `Allowed MIME types` 设置，
> 一定要设。

---

## 第 4 步：填写环境变量

在项目根目录建 `.env`（已被 `.gitignore` 忽略，不会提交）：

```bash
PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

---

## 第 5 步：开启功能

改 `src/config/guestbookConfig.ts`：

```ts
export const guestbookConfig: GuestbookConfig = {
	enable: true,   // ← 改成 true
	// ...
};
```

然后本地跑 `pnpm dev`，打开 `/guestbook/` 验证能正常读写。

---

## 第 6 步（建议）：配置人机验证

留言板一定会被刷广告，**强烈建议开启验证**。

1. 注册 https://www.hcaptcha.com（免费额度足够个人站用）
2. 在 hCaptcha 后台添加你的域名，拿到 **Site Key** 和 **Secret Key**
3. Supabase 后台 → **Authentication → Attack Protection** → 开启 hCaptcha，填入 **Secret Key**
4. 把 **Site Key** 填进 `src/config/guestbookConfig.ts`：

```ts
captcha: {
  enable: true,
  siteKey: "你的 hCaptcha Site Key",
},
```

这样流程就完整了：前端拿到 hCaptcha token → 随请求发给 Supabase →
Supabase 拿去 hCaptcha 验证 → 通过才允许写库。

> 没配验证时也能用，但建议配合下面「防刷手段」里的其他措施。

---

## 防刷手段一览

留言板已经内置了这些：

| 手段 | 在哪实现 | 说明 |
| --- | --- | --- |
| 长度限制 | 前端 + **数据库 check 约束** | 昵称 32 字、内容 500 字 |
| 蜜罐字段 | `GuestbookForm.astro` | 隐藏输入框，机器人会填，填了就不写库 |
| 图片大小/类型 | 前端 + **存储桶设置** | 2MB，仅 jpg/png/webp/gif |
| 内容转义 | `guestbook.astro` 的 `escapeHtml` | 防止留言内容里的 HTML 被执行（XSS） |
| 人机验证 | hCaptcha + Supabase | 需按第 6 步配置 |

**还需要你自己做的**：

- **定期清理**：广告留言不会自动消失，隔段时间去 Supabase 的 Table Editor 删一批
- **频率限制**：Supabase 免费版没有内置限流。如果被刷得厉害，
  可以在 Supabase 后台给 `anon` 角色加更严格的策略，或者临时把
  `guestbookConfig.enable` 关掉止血
- **内容审核**：当前是「通过验证即显示」。如果想要「先审后发」，
  可以给表加一个 `approved boolean default false` 字段，
  读取策略改成 `using (approved = true)`，你自己在后台把想放的改成 true

---

## 常见问题

**留言板显示「加载失败」**

打开浏览器控制台看具体报错。常见原因：
- `.env` 没填或填错 → 确认 `PUBLIC_SUPABASE_URL` 格式是 `https://xxx.supabase.co`
- 环境变量改了但没重启 dev server → 重启 `pnpm dev`
- RLS 策略没生效 → 回第 2 步确认 SQL 全部执行成功

**能读到留言但提交失败**

多半是 RLS 的 insert 策略或 hCaptcha 配置问题。先看控制台的 HTTP 状态码：
- `401` / `403` → 权限策略问题
- `400` → 通常是 hCaptcha 校验没过

**图片上传失败**

检查三处：存储桶是否是 public、第 3 步的 storage 策略是否执行、
桶的 size limit 是否小于 `guestbookConfig.imageMaxBytes`。

**部署到线上后留言板不工作**

`.env` 里的变量需要在**构建时**注入。本地构建没问题但线上不行，
通常是 CI/托管平台没配这两个环境变量 —— 记得在你的部署平台
（Vercel / GitHub Actions / 服务器）上也加上。
