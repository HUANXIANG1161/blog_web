# 幻想1161 的博客

个人博客站点，用 [Astro](https://astro.build/) 构建，基于 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki) 主题改造。

## 现在有什么

导航栏上的内容就是站点的全部板块：

| 板块 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `/` | 文章列表，支持列表/网格切换 |
| 归档 | `/archive/` | 按时间归档 |
| 日记 | `/diary/` | 短记录，数据在 `src/data/diary.ts` |
| 相册 | `/albums/` | 自动扫描 `public/images/albums/` 下的文件夹 |
| 项目 | `/projects/` | 数据在 `src/data/projects.ts`（目前为空） |
| 技能 | `/skills/` | 数据在 `src/data/skills.ts` |
| 友链 | `/friends/` | 数据在 `src/data/friends.ts` |
| 关于 | `/about/` | 内容在 `src/content/spec/about.md` |

## 本地开发

需要 Node 20+ 和 pnpm。

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

常用命令：

```bash
pnpm check      # astro check，类型检查
pnpm test       # 运行测试
pnpm build      # 构建到 dist/
pnpm preview    # 预览构建结果
pnpm new-post   # 新建一篇文章
pnpm lint       # Biome 检查并修复
pnpm format     # Biome 格式化
```

## 目录结构

```
src/
├── config/           站点配置（改这里就够了）
│   ├── siteConfig.ts     站点标题、URL、主题色、横幅、页面开关
│   ├── profileConfig.ts  头像、昵称、简介、社交链接
│   ├── navBarConfig.ts   导航栏菜单
│   └── sidebarConfig.ts  侧边栏组件
├── content/
│   ├── posts/            文章（Markdown / MDX）
│   └── spec/             about、friends 页面内容
├── data/             结构性数据（技能、项目、友链、日记）
├── components/       组件
├── layouts/          布局
├── pages/            路由
└── styles/           样式
public/
├── assets/           横幅、音乐等静态资源
├── images/albums/    相册（文件夹名即相册 ID）
└── favicon/          站点图标
```

## 需要自己补上的地方

- **`siteURL`**：`src/config/siteConfig.ts` 里目前是 `https://TODO-your-domain.com/`。
  这个值会进入 canonical、RSS、Atom 和 sitemap，部署前必须改成真实域名（以斜杠结尾）。
- **GitHub 链接**：`src/config/profileConfig.ts` 和 `src/config/navBarConfig.ts` 里各有一处
  `TODO-your-github` 占位，没有 GitHub 账号可以把对应项删掉。

## 已经删掉的东西

原主题自带但本站没有启用的功能，对应的页面、组件、数据、脚本和资源已经清理：
番剧、时间线、设备、AI 工具、评论（Twikoo/Giscus）、音乐播放器、Live2D 看板娘、
樱花特效、OG 图片生成、IndexNow 提交。

因此 `siteConfig.featurePages` 里只剩下日记、友链、项目、技能、相册五个开关。

## 说明

- 文章图片有两种引用基准：以 `/` 开头是相对 `public/`，否则相对当前 Markdown 文件。
- 默认使用系统字体。想启用自定义字体，把 `siteConfig.font.mode` 改成 `"custom"`，
  并按 `src/layouts/Layout.astro` 里的注释取消 `<Font />` 那几行。
- 主题的许可与第三方声明见 `LICENSE`、`LICENSE.MIT` 和 `THIRD_PARTY_NOTICES.md`。
