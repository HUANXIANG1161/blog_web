/**
 * 生成站点自有的品牌图片。
 *
 * 设计：简洁的「地球仪」标记——浏览器默认网页图标的通用样式。
 * 全部用矢量路径绘制，不依赖系统字体渲染（用字体画汉字时，
 * 不同字体的轮廓质量差别很大，放大后容易变成怪形状）。
 *
 * 输出：
 *   public/assets/home/home.webp               顶栏图标（圆角方形底 + 地球仪）
 *   public/favicon/favicon.ico                 站点图标（多尺寸 ico）
 *   public/assets/home/default-logo.webp       横版文字 Logo·浅色模式（备用）
 *   public/assets/home/default-logo-dark.webp  横版文字 Logo·深色模式（备用）
 *
 * 当前 siteConfig.navbarTitle.mode = "text-icon"，只用到 home.webp 和 favicon.ico。
 * 若改成 "logo" 模式，顶栏会改用 default-logo*.webp。
 *
 * 用法：node scripts/generate-brand-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const homeDir = path.join(rootDir, "public", "assets", "home");
const faviconDir = path.join(rootDir, "public", "favicon");

// 与 siteConfig.themeColor.hue = 250 对应的主色
const PRIMARY = "#6366f1";
const PRIMARY_DARK = "#4338ca";
const GLOBE_STROKE = "#ffffff";

const CJK_FONT = "Microsoft YaHei, SimHei, sans-serif";

/**
 * 地球仪标记（经典经纬线样式）。
 * @param {number} size 画布边长
 * @param {number} inset 图标相对画布的留白比例（0 = 铺满）
 * @param {boolean} plate 是否加圆角底板
 */
function globeSvg(size, inset, plate) {
	const pad = size * inset;
	const box = size - pad * 2;
	const cx = size / 2;
	const cy = size / 2;
	const r = box * 0.32;
	// 经线椭圆的横向半径：0.45 左右最像地球仪；太宽会变成毛线球
	const meridianRx = r * 0.42;
	// 纬线椭圆的纵向半径
	const latRy = r * 0.45;
	const stroke = Math.max(size * 0.055, 2);
	const plateR = box * 0.22;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PRIMARY}"/>
      <stop offset="1" stop-color="${PRIMARY_DARK}"/>
    </linearGradient>
  </defs>
  ${
		plate
			? `<rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${plateR}" fill="url(#plate)"/>`
			: ""
	}
  <g fill="none" stroke="${GLOBE_STROKE}" stroke-width="${stroke}" stroke-linecap="round">
    <circle cx="${cx}" cy="${cy}" r="${r}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${meridianRx}" ry="${r}"/>
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${latRy}"/>
  </g>
</svg>`;
}

/** 横版文字 Logo：地球仪底板 + 「幻想1161」 */
function wordmarkSvg(textColor) {
	const h = 254;
	const plate = 186;
	const plateY = (h - plate) / 2;
	const iconSvg = globeSvg(plate, 0, true).replace(
		/<svg[^>]*>|<\/svg>/g,
		"",
	);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="772" height="${h}" viewBox="0 0 772 ${h}">
  <g transform="translate(8 ${plateY})">${iconSvg}</g>
  <text x="${8 + plate + 34}" y="${h / 2}" dominant-baseline="central"
        font-family="${CJK_FONT}" font-size="104" font-weight="700" fill="${textColor}">幻想1161</text>
</svg>`;
}

await mkdir(homeDir, { recursive: true });
await mkdir(faviconDir, { recursive: true });

// 顶栏图标
await sharp(Buffer.from(globeSvg(1024, 0.04, true)))
	.webp({ quality: 92 })
	.toFile(path.join(homeDir, "home.webp"));

// 备用横版文字 Logo
await sharp(Buffer.from(wordmarkSvg("#1f2937")))
	.webp({ quality: 92 })
	.toFile(path.join(homeDir, "default-logo.webp"));
await sharp(Buffer.from(wordmarkSvg("#f9fafb")))
	.webp({ quality: 92 })
	.toFile(path.join(homeDir, "default-logo-dark.webp"));

// .ico 内嵌 PNG，尺寸从 16 到 256
const icoSizes = [16, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
	icoSizes.map((size) =>
		// 小尺寸下去掉留白、描边加粗，否则 16px 会糊成一团
		sharp(Buffer.from(globeSvg(1024, size <= 32 ? 0.0 : 0.04, true)))
			.resize(size, size)
			.png()
			.toBuffer(),
	),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4); // image count

const entries = [];
let offset = 6 + 16 * icoSizes.length;
for (let i = 0; i < icoSizes.length; i += 1) {
	const size = icoSizes[i];
	const data = pngs[i];
	const entry = Buffer.alloc(16);
	entry.writeUInt8(size >= 256 ? 0 : size, 0); // width（0 表示 256）
	entry.writeUInt8(size >= 256 ? 0 : size, 1); // height（0 表示 256）
	entry.writeUInt8(0, 2); // palette
	entry.writeUInt8(0, 3); // reserved
	entry.writeUInt16LE(1, 4); // color planes
	entry.writeUInt16LE(32, 6); // bits per pixel
	entry.writeUInt32LE(data.length, 8);
	entry.writeUInt32LE(offset, 12);
	entries.push(entry);
	offset += data.length;
}

await writeFile(
	path.join(faviconDir, "favicon.ico"),
	Buffer.concat([header, ...entries, ...pngs]),
);

console.log("已生成：");
console.log("  public/assets/home/home.webp");
console.log("  public/assets/home/default-logo.webp");
console.log("  public/assets/home/default-logo-dark.webp");
console.log("  public/favicon/favicon.ico");
