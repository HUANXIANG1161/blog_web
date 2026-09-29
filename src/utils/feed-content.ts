import { parse } from "node-html-parser";
import sanitizeHtml from "sanitize-html";

const HTML_TAGS = [
	"a",
	"abbr",
	"address",
	"article",
	"aside",
	"b",
	"bdi",
	"bdo",
	"blockquote",
	"br",
	"caption",
	"cite",
	"code",
	"col",
	"colgroup",
	"dd",
	"del",
	"details",
	"div",
	"dl",
	"dt",
	"em",
	"figcaption",
	"figure",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"hr",
	"i",
	"img",
	"kbd",
	"li",
	"main",
	"mark",
	"ol",
	"p",
	"picture",
	"pre",
	"q",
	"rp",
	"rt",
	"ruby",
	"s",
	"samp",
	"section",
	"small",
	"source",
	"span",
	"strong",
	"sub",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"time",
	"tr",
	"u",
	"ul",
	"var",
	"wbr",
];

const MATHML_TAGS = [
	"math",
	"maction",
	"menclose",
	"merror",
	"mfenced",
	"mfrac",
	"mglyph",
	"mi",
	"mlabeledtr",
	"mlongdiv",
	"mmultiscripts",
	"mn",
	"mo",
	"mover",
	"mpadded",
	"mphantom",
	"mprescripts",
	"mroot",
	"mrow",
	"ms",
	"mscarries",
	"mscarry",
	"msgroup",
	"msline",
	"mspace",
	"msqrt",
	"msrow",
	"mstack",
	"mstyle",
	"msub",
	"msubsup",
	"msup",
	"mtable",
	"mtd",
	"mtext",
	"mtr",
	"munder",
	"munderover",
	"semantics",
	"annotation",
];

const GLOBAL_ATTRIBUTES = [
	"id",
	"class",
	"title",
	"lang",
	"dir",
	"role",
	"aria-*",
	"data-*",
	"hidden",
	"tabindex",
	"colspan",
	"rowspan",
	"scope",
	"datetime",
	"open",
	"width",
	"height",
	"mathvariant",
	"display",
	"encoding",
];

export const FEED_SANITIZER_SCHEMA: sanitizeHtml.IOptions = {
	allowedTags: [...HTML_TAGS, ...MATHML_TAGS],
	allowedAttributes: {
		"*": GLOBAL_ATTRIBUTES,
		a: ["href", "target", "rel", "name", ...GLOBAL_ATTRIBUTES],
		img: [
			"src",
			"srcset",
			"sizes",
			"alt",
			"loading",
			"decoding",
			"referrerpolicy",
			...GLOBAL_ATTRIBUTES,
		],
		source: ["src", "srcset", "sizes", "type", "media", ...GLOBAL_ATTRIBUTES],
	},
	allowedSchemes: ["http", "https", "mailto", "tel"],
	allowedSchemesByTag: {
		img: ["http", "https", "data"],
		source: ["http", "https", "data"],
	},
	allowProtocolRelative: true,
	parser: {
		lowerCaseAttributeNames: false,
		lowerCaseTags: false,
	},
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/**
 * 简化 Expressive Code 输出的代码块。
 *
 * 页面上的代码块依赖站点 CSS（.expressive-code 那一整套）和行内 --0/--1 主题变量
 * 才能正常显示；feed 里没有这些 CSS，原样塞进去在阅读器中会变成一堆散乱的 span、
 * 行号、复制按钮和颜色变量。这里把它们还原成朴素的 <pre><code>。
 *
 * 注意：必须在 sanitize-html 之前、且以字符串方式处理。
 * HTML 规范里 <code> 是 raw-text 元素，HTML 解析器不会把它的子节点建成 DOM 节点，
 * 所以 querySelectorAll(".ec-line") 是查不到的，只能对字符串做替换。
 */
function simplifyCodeBlocks(html: string): string {
	const simplifyOne = (block: string): string =>
		block
			// 每行是 <div class="ec-line">，其中 .code 内才是真正的内容
			.replace(
				/<div class="ec-line"[^>]*>(?:(?!<\/div>\s*<div class="ec-line")[\s\S])*?<div class="code">([\s\S]*?)<\/div>\s*<\/div>/g,
				(_match, inner: string) => `\n${inner}`,
			)
			// 行号、复制按钮、语言角标都是纯装饰
			.replace(/<div class="gutter">[\s\S]*?<\/div>\s*<\/div>/g, "")
			.replace(/<div class="copy-btn-icon">\s*<\/div>/g, "")
			// 行内容器的类名没有意义了，去掉
			.replace(/<span class="indent">/g, "<span>")
			.replace(/<span class=""[^>]*>/g, "<span>")
			// 只保留 <pre data-language="...">，其余 EC 的类名/属性都去掉
			.replace(
				/<div class="expressive-code[^"]*">([\s\S]*?)<\/div>\s*(?=<|$)/g,
				"$1",
			)
			.replace(/<figure class="frame"[^>]*>/g, "<figure>")
			.replace(/<pre([^>]*?)class="wrap"/g, "<pre$1")
			.replace(/\s*style="[^"]*"/g, "");

	// pre 区块整体处理，避免跨块误伤
	return html.replace(/<div class="expressive-code[\s\S]*?<\/figure><\/div>/g, (block) =>
		simplifyOne(block),
	);
}

function expandCodeGroups(root: ReturnType<typeof parse>) {
	for (const group of root.querySelectorAll(".rehype-code-group")) {
		const labels = group
			.querySelectorAll('[role="tab"]')
			.map((tab) => tab.textContent.trim());
		group.querySelector('[role="tablist"]')?.remove();

		group.querySelectorAll('[role="tabpanel"]').forEach((panel, index) => {
			panel.removeAttribute("hidden");
			panel.removeAttribute("role");
			panel.removeAttribute("aria-labelledby");
			panel.removeAttribute("id");
			const label = labels[index] || `Code example ${index + 1}`;
			panel.insertAdjacentHTML(
				"afterbegin",
				`<p class="feed-code-label"><strong>${escapeHtml(label)}</strong></p>`,
			);
		});
	}
}

function isSpecialUrl(value: string): boolean {
	return /^(?:data:|blob:|mailto:|tel:|#)/i.test(value);
}

function absoluteUrl(value: string, base: URL): string {
	if (!value || isSpecialUrl(value)) {
		return value.startsWith("#") ? new URL(value, base).href : value;
	}
	try {
		return new URL(value, base).href;
	} catch {
		return value;
	}
}

function absoluteSrcset(value: string, base: URL): string {
	if (/^\s*data:/i.test(value)) return value;
	return value
		.split(",")
		.map((candidate) => {
			const [url, ...descriptor] = candidate.trim().split(/\s+/);
			return [absoluteUrl(url, base), ...descriptor].join(" ");
		})
		.join(", ");
}

function absolutizeUrls(root: ReturnType<typeof parse>, base: URL) {
	for (const attribute of ["href", "src", "poster", "cite"]) {
		for (const element of root.querySelectorAll(`[${attribute}]`)) {
			const value = element.getAttribute(attribute);
			if (value) element.setAttribute(attribute, absoluteUrl(value, base));
		}
	}

	for (const element of root.querySelectorAll("[srcset]")) {
		const value = element.getAttribute("srcset");
		if (value) element.setAttribute("srcset", absoluteSrcset(value, base));
	}
}

export interface PrepareFeedHtmlOptions {
	html: string;
	site: URL;
	postUrl: URL;
}

export function prepareFeedHtml({
	html,
	postUrl,
}: PrepareFeedHtmlOptions): string {
	// 代码块简化必须走字符串，且要在 parse 之前 —— <code> 是 raw-text 元素，
	// 解析后拿不到它的子节点（详见 simplifyCodeBlocks 的说明）。
	const withoutScripts = html.replace(
		/<(script|template|noscript|svg|style)\b[\s\S]*?<\/\1>/gi,
		"",
	);
	const simplified = simplifyCodeBlocks(withoutScripts);

	const root = parse(simplified);
	expandCodeGroups(root);
	absolutizeUrls(root, postUrl);

	return sanitizeHtml(root.toString(), FEED_SANITIZER_SCHEMA);
}
