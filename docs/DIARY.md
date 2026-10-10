# 日记接入 Supabase 配置指南

日记数据存在 Supabase，**只有你自己能写**（需要邮箱密码登录），访客只能看。
日记页在客户端拉取数据，所以写完刷新页面就能看到，**不需要等站点重新构建**。

配置步骤比留言板多一步：要建登录账号。

---

## 与留言板的权限区别

| | 留言板 | 日记 |
| --- | --- | --- |
| 匿名读取 | ✅ | ✅ |
| 匿名写入 | ✅（靠人机验证防刷） | ❌ |
| 登录后写入 | — | ✅ |

两者用的是**同一个 anon key**，能做什么完全由数据库的行级安全策略决定。

---

## 第 1 步：复用 Supabase 项目

如果你已经配好了留言板，**直接复用同一个项目**，跳过创建。
`.env` 里的 `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` 也是共用的。

---

## 第 2 步：建日记表

SQL Editor 里新建查询，执行：

```sql
-- ─────────────────────────────────────────────
-- 日记表
-- ─────────────────────────────────────────────
create table if not exists public.diary_entries (
  id          bigint generated always as identity primary key,
  content     text        not null,
  images      text[]      not null default '{}',
  tags        text[]      not null default '{}',
  created_at  timestamptz not null default now(),

  -- 数据库层面兜底：前端校验可以被绕过
  constraint content_length check (char_length(content) between 1 and 2000),
  constraint images_count   check (array_length(images, 1) is null or array_length(images, 1) <= 9),
  constraint tags_count     check (array_length(tags, 1) is null or array_length(tags, 1) <= 20)
);

create index if not exists diary_entries_created_at_idx
  on public.diary_entries (created_at desc);

-- ─────────────────────────────────────────────
-- 行级安全：匿名只读，登录用户可写
-- ─────────────────────────────────────────────
alter table public.diary_entries enable row level security;

-- 任何人都能看日记
drop policy if exists "diary_public_read" on public.diary_entries;
create policy "diary_public_read"
  on public.diary_entries
  for select
  to anon, authenticated
  using (true);

-- 只有登录用户能写。注意角色是 authenticated，
-- 匿名访客（anon）不在这条策略的授权范围内，会被直接拒绝。
drop policy if exists "diary_auth_insert" on public.diary_entries;
create policy "diary_auth_insert"
  on public.diary_entries
  for insert
  to authenticated
  with check (true);

drop policy if exists "diary_auth_update" on public.diary_entries;
create policy "diary_auth_update"
  on public.diary_entries
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "diary_auth_delete" on public.diary_entries;
create policy "diary_auth_delete"
  on public.diary_entries
  for delete
  to authenticated
  using (true);
```

> 因为只有你能登录，所以这三条策略都写成 `using (true)` 就够了 ——
> 不需要区分「是谁写的」，反正只有你的账号能通过 `authenticated` 这一关。

---

## 第 3 步：建图片存储桶

1. **Storage → New bucket**
2. Name 填 `diary`
3. **勾选 Public bucket**（日记图片要能公网访问）
4. File size limit 填 `5` MB
5. Allowed MIME types 填 `image/jpeg,image/png,image/webp,image/gif`

然后回 SQL Editor 执行：

```sql
-- 只有登录用户能上传日记图片
drop policy if exists "diary_image_insert" on storage.objects;
create policy "diary_image_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'diary');

-- 图片公开可读
drop policy if exists "diary_image_read" on storage.objects;
create policy "diary_image_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'diary');
```

> ⚠️ **桶是 public 的**，意味着任何拿到图片地址的人都能查看。
> 对公开日记来说这是符合预期的，但你要知道这一点。

---

## 第 4 步：创建你的登录账号

1. **Authentication → Users → Add user → Create new user**
2. 填你的邮箱和密码
3. **勾选 Auto Confirm User**（否则需要点邮件里的确认链接才能登录）

### ⚠️ 然后务必关掉注册

**Authentication → Sign In / Providers → Email**，把 **Allow new users to sign up** 关掉。

**这一步不能省。** 如果不关，任何人都能自己注册一个账号，
注册后就是 `authenticated` 角色，**可以直接写你的日记**。

> 关掉注册不影响你已创建的那个账号登录。

---

## 第 5 步：确认环境变量

`.env` 里这两个值（与留言板共用，通常已经配好了）：

```bash
PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

如果你在 Supabase 开启了验证码保护（见下面第 5.5 步），还要再加一个。

## 第 5.5 步：如果开了验证码保护，必须配 Turnstile

**这一步很容易漏，漏了就会「登录失败」且看不出原因。**

如果你在 **Authentication → Attack Protection** 里开启了验证码保护，
Supabase 会拒绝所有不带验证码 token 的登录请求：

```json
{"error_code":"captcha_failed",
 "msg":"captcha protection: request disallowed (no captcha_token found)"}
```

Supabase 的验证码保护用的是 **Cloudflare Turnstile**（注意：不是 hCaptcha，
两者不通用）。所以需要：

1. 打开 https://dash.cloudflare.com → **Turnstile** → **Add widget**
2. 填你的域名（本地调试再加 `localhost`）
3. 拿到 **Site Key** 和 **Secret Key**
4. **Secret Key** → 填进 Supabase 的 **Authentication → Attack Protection**
   （你如果已经开了保护，这一步应该已经填过了）
5. **Site Key** → 填进项目根目录的 `.env`：

```bash
PUBLIC_TURNSTILE_SITE_KEY=你的Turnstile SiteKey
```

6. **重启 dev server**（改了 `.env` 必须重启，Vite 不会热更新环境变量）

配好后，登录表单上方会出现一个 Turnstile 验证框，通过后才能登录。

> ⚠️ 常见误区：以为「Supabase 后台填过 Secret 就行了」。
> 不够 —— 前端还需要 Site Key 才能渲染出验证框、
> 拿到 token 交给 Supabase 校验。两个都要填，而且是两个不同的值。

---

## 第 6 步：开始写日记

打开 **`/admin/diary/`**，用第 4 步创建的邮箱密码登录，就能写了。

- 写完点「发布」，**刷新 `/diary/` 即可看到**，不需要重新构建站点
- 已有的日记可以在下面列表里「编辑」或「删除」
- 支持上传图片（最多 9 张）和标签（用逗号分隔）

---

## 关于静态数据

`src/data/diary.ts` 里的静态日记仍然保留：

- **构建时会先渲染出来**，作为首屏内容
- Supabase 数据拉取成功后**整体替换**掉
- 拉取失败时页面不会空白，仍然显示静态数据

所以这个文件现在是「兜底内容」。你可以：

- **保留**它作为兜底（推荐）
- 或者**清空**它，让页面完全由 Supabase 驱动

---

## 常见问题

**登录后还是看不到编辑器**

打开控制台看报错。常见原因：
- 账号没勾 Auto Confirm，处于未确认状态
- `.env` 没配或改了没重启 dev server

**登录一直提示「登录失败」**

先看浏览器控制台里的真实报错。如果看到 `captcha_failed`，
说明 **Supabase 开了验证码保护但前端没配 Turnstile Site Key**，
按上面「第 5.5 步」配置 `PUBLIC_TURNSTILE_SITE_KEY` 并重启 dev server。

判断方法：登录表单上方**有没有出现验证框**。
没有验证框 = Site Key 没配。

其他可能：
- `invalid_credentials` → 邮箱或密码错了
- `email_not_confirmed` → 账号未确认，去 Authentication → Users 检查状态

**能登录但发布失败**

看 HTTP 状态码：
- `401` / `403` → RLS 策略问题，回第 2 步确认 `to authenticated` 的策略都建好了
- `400` → 通常是内容超长或图片数量超限，检查第 2 步的 check 约束

**图片上传失败**

检查：桶是否 public、第 3 步的 storage 策略是否执行、
桶的 size limit 是否 ≥ 5MB、上传时是否处于登录状态。

**日记页看不到新写的日记**

- 确认发布成功了（管理页会提示「已发布」）
- 刷新 `/diary/`（不是管理页）
- 看控制台有没有拉取报错

**别人能注册账号吗**

去 **Authentication → Sign In / Providers → Email** 确认
**Allow new users to sign up 是关闭的**。这是最关键的一条安全设置。

**部署到线上后管理页登录不上**

`.env` 里的变量需要在**构建时**注入。如果你用的是 EdgeOne 之类的托管平台，
记得在平台的环境变量设置里也加上 `PUBLIC_SUPABASE_URL` 和
`PUBLIC_SUPABASE_ANON_KEY`，否则线上构建出来的页面连不上 Supabase。
