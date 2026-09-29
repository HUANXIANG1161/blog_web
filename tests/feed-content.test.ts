import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { XMLValidator } from "fast-xml-parser";

import { prepareFeedHtml } from "../src/utils/feed-content.ts";
import { buildAtomFeed } from "../src/utils/feed-xml.ts";

describe("feed content post-processing", () => {
	it("keeps static semantics while removing executable and interactive markup", () => {
		const html = `
			<script>window.bad = true</script>
			<blockquote class="admonition bdm-note"><div class="bdm-title">NOTE</div><p>Readable callout</p></blockquote>
			<div class="rehype-code-group">
				<div role="tablist"><button role="tab">TypeScript</button><button role="tab">Shell</button></div>
				<div role="tabpanel" id="one"><pre><code>const target = "feed"</code></pre></div>
				<div role="tabpanel" id="two" hidden><pre><code>pnpm build</code></pre></div>
			</div>
			<a class="card-wiki-link" href="../guide/"><div class="wlc-title">Guide</div><div class="wlc-description">Wiki summary</div></a>
			<span class="katex"><math><mrow><mi>E</mi><mo>=</mo><mi>m</mi></mrow></math></span>
			<img src="/images/fixture.webp" alt="Fixture" onerror="alert(1)">
			<a href="/about/" data-content-link-kind="internal" onclick="alert(1)">About</a>
		`;

		const result = prepareFeedHtml({
			html,
			site: new URL("https://example.com/"),
			postUrl: new URL("https://example.com/posts/fixture/"),
		});

		assert.match(result, /Readable callout/);
		assert.match(result, /TypeScript/);
		assert.match(result, /Shell/);
		assert.match(result, /const target = "feed"/);
		assert.match(result, /pnpm build/);
		assert.match(result, /Wiki summary/);
		assert.match(result, /<math>/);
		assert.match(result, /href="https:\/\/example\.com\/posts\/guide\/"/);
		assert.match(result, /src="https:\/\/example\.com\/images\/fixture\.webp"/);
		assert.match(result, /href="https:\/\/example\.com\/about\/"/);
		assert.match(result, /data-content-link-kind="internal"/);
		assert.doesNotMatch(
			result,
			/<script|<button|\shidden(?:=|\s|>)|\son(?:click|error)=/i,
		);
	});

	it("flattens Expressive Code blocks into plain, line-separated code", () => {
		// <code> 是 raw-text 元素，解析器不会把子节点建成 DOM，所以这里
		// 用 EC 真实输出的结构来卡住「必须走字符串处理」这条约束。
		const html = `<div class="expressive-code"><figure class="frame"><figcaption class="header"></figcaption><pre data-language="ts" class="wrap"><code><div class="ec-line"><div class="gutter"><div class="ln" aria-hidden="true">1</div></div><div class="code"><span style="--0:#000;--1:#fff">const a = 1;</span></div></div><div class="ec-line"><div class="gutter"><div class="ln" aria-hidden="true">2</div></div><div class="code"><span class="indent"><span>  </span></span><span style="--0:#000">const b = 2;</span></div></div></code></pre><div class="copy-btn-icon"></div></figure></div>`;

		const result = prepareFeedHtml({
			html,
			site: new URL("https://example.com/"),
			postUrl: new URL("https://example.com/posts/fixture/"),
		});

		assert.match(result, /const a = 1;/);
		assert.match(result, /const b = 2;/);
		// 两行之间必须有换行，否则代码会挤成一行
		assert.match(result, /const a = 1;<\/span>\s*\n\s*<span/);
		// 装饰性与主题相关的内容全部清掉
		for (const noise of [
			"ec-line",
			"gutter",
			"copy-btn-icon",
			"--0:",
			"--1:",
			"style=",
		]) {
			assert.doesNotMatch(result, new RegExp(noise));
		}
	});
});

describe("Atom XML generation", () => {
	it("escapes metadata and safely splits CDATA terminators", () => {
		const xml = buildAtomFeed({
			title: "Mizuki & Friends",
			subtitle: "<Static> content",
			language: "en",
			author: 'Dawn "黎明"',
			site: new URL("https://example.com/"),
			items: [
				{
					title: "MD & MDX <fixture>",
					description: "Summary & details",
					pubDate: new Date("2026-08-08T00:00:00.000Z"),
					updated: new Date("2026-08-09T00:00:00.000Z"),
					link: "https://example.com/posts/fixture/",
					content: "<p>before ]]> after</p>",
					category: 'Examples & "Tests"',
				},
			],
		});

		assert.equal(XMLValidator.validate(xml), true);
		assert.match(xml, /Mizuki &amp; Friends/);
		assert.match(
			xml,
			/<!\[CDATA\[<p>before \]\]\]\]><!\[CDATA\[> after<\/p>\]\]>/,
		);
		assert.match(xml, /<updated>2026-08-09T00:00:00\.000Z<\/updated>/);
	});

	it("normalizes underscore language codes to RFC 1766 form", () => {
		const xml = buildAtomFeed({
			title: "t",
			subtitle: "s",
			language: "zh_CN",
			author: "a",
			site: new URL("https://example.com/"),
			items: [],
		});
		assert.match(xml, /xml:lang="zh-CN"/);
		assert.doesNotMatch(xml, /zh_CN/);
	});
});
