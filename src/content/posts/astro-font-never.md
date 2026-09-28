---
title: Astro Font API 在关闭自定义字体时的类型错误
published: 2026-09-29
description: 记录一次 astro check 报出的 "Type 'string' is not assignable to type 'never'"，原因在 Astro Font API 生成的 CssVariable 类型会在 fonts 为空数组时退化成 never。
tags: [Astro, TypeScript, 踩坑]
category: 折腾记录
draft: false
---

清理模版时遇到一个挺隐蔽的报错，`astro check` 输出长这样：

```
src/layouts/Layout.astro:166:32 - error ts(2322): Type 'string' is not assignable to type 'never'.
  {customFontsEnabled && <Font cssVariable="--font-body" preload />}
                                 ~~~~~~~~~~~
```

`Layout.astro` 里一共三处，分别是 `--font-body`、`--font-cjk`、`--font-jetbrains-mono`。

## 为什么是 `never`

关键在于：**这个字符串是合法的，问题出在类型上。**

Astro 的 Font API 会为配置里注册的每个字体生成一个字面量联合类型。翻一下 Astro 源码（`astro/dist/assets/fonts/sync.js`）能看到生成逻辑：

```js
export type CssVariable = (${JSON.stringify(settings.config.fonts.map((family) => family.cssVariable))})[number];
```

也就是说，它拿 `astro.config.mjs` 里 `fonts` 数组的 `cssVariable` 拼成一个元组再取 `[number]` 索引。

这个博客的字体配置是条件生成的：

```js
const customFontsEnabled = resolveFontMode(siteConfig) === "custom";

export default defineConfig({
	fonts: customFontsEnabled ? [/* 三个字体 */] : [],
	// ...
});
```

而 `siteConfig.font.mode` 设的是 `"system"`，于是 `fonts` 是空数组，生成出来的声明就变成了：

```ts
declare module "astro:assets" {
	export type CssVariable = ([])[number];
}
```

空元组取 `[number]`，在 TypeScript 里结果就是 `never`。而 `<Font />` 组件的 `cssVariable` 属性类型正是 `CssVariable`，所以传任何字符串都会报「不能把 `string` 赋给 `never`」。

**运行期其实是安全的**——外面已经有 `customFontsEnabled &&` 挡着，字体没开时 `<Font />` 根本不会渲染。纯粹是类型层面退化。

## 怎么修

如果确定要用自定义字体，把 `siteConfig.font.mode` 改成 `"custom"` 就行，`fonts` 数组不再是空的，`CssVariable` 恢复成正常的字面量联合，报错自然消失。

但这个博客选了系统字体（`"system"`），那就意味着 `<Font />` 这几行是**永远走不到的死代码**，留着只会一直报错。所以我的处理是把它注释掉，并在旁边写清楚为什么：

```astro
{/*
	自定义字体由 Astro Font API 输出 @font-face 与 CSS 变量，需要 <Font /> 组件。
	当前 siteConfig.font.mode 为 "system"，astro.config.mjs 里 fonts 为空数组，
	astro:assets 生成的 CssVariable 类型退化为 never，渲染 <Font /> 会报类型错误。

	想启用自定义字体：把 siteConfig.font.mode 改成 "custom"，再取消下面注释：

	{customFontsEnabled && <Font cssVariable="--font-body" preload />}
	{customFontsEnabled && <Font cssVariable="--font-cjk" />}
	{customFontsEnabled && <Font cssVariable="--font-jetbrains-mono" />}
*/}
```

注意注释掉之后，`import { Font } from "astro:assets"` 和 `const customFontsEnabled = ...` 就没人用了，得一起删掉，否则 lint 会报未使用变量。

CSS 变量那边不需要额外处理。`main.css` 里的字体栈本身就带了兜底：

```css
--font-sans: var(--font-body, ui-sans-serif), var(--font-cjk, system-ui), ui-sans-serif, system-ui, sans-serif, ...;
```

`--font-body` 没定义时会自动落到 `ui-sans-serif`，不会出现字体塌掉的情况。

## 另一种修法

如果不想删代码，也可以在渲染时断言类型。不过 `<Font>` 的 `cssVariable` 是 `never`，不能直接 `as`，得绕过 `unknown`：

```astro
<Font cssVariable={"--font-body" as unknown as never} preload />
```

能过检查，但把一个「配置上必然为空」的类型谎报成合法值，我觉得不如直接注释掉来得诚实。要是哪天重新开自定义字体，把 `mode` 改回 `"custom"` 并取消注释即可，两行的事。

## 小结

`never` 这个报错乍看很莫名其妙，但只要记住一条就够用了：**Astro 这类「由配置推导类型」的 API，配置为空时联合类型会退化成 `never`。** 遇到 `Type 'string' is not assignable to type 'never'`，先去翻生成类型的那段源码，基本一眼就能看出是哪个配置项空了。
