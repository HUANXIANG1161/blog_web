// 用无头 Chrome 真实渲染 dist，模拟手机视口，检查 banner 的最终状态
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = process.argv[2] || "http://localhost:4173/";
const outFile = "dom-dump.html";

// --dump-dom 会先执行脚本再输出 DOM；用 window-size + 移动端 UA 模拟手机
const args = [
	"--headless=new",
	"--disable-gpu",
	"--no-sandbox",
	"--virtual-time-budget=6000",
	"--window-size=390,844", // iPhone 14 尺寸
	"--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
	"--dump-dom",
	URL,
];

console.log("渲染:", URL, "  视口 390x844");
const dom = execFileSync(CHROME, args, {
	encoding: "utf8",
	maxBuffer: 64 * 1024 * 1024,
	stdio: ["ignore", "pipe", "ignore"],
});
fs.writeFileSync(outFile, dom, "utf8");
console.log(`DOM 已保存 (${(dom.length / 1024).toFixed(0)} KB) -> ${outFile}`);

const wrap = dom.match(/<div id="banner-wrapper"[^>]*>/);
console.log("\n=== banner-wrapper 最终 HTML ===");
console.log(wrap ? wrap[0] : "未找到 banner-wrapper");

const bodyTag = dom.match(/<body[^>]*>/);
console.log("\n=== body 标签 ===");
console.log(bodyTag ? bodyTag[0] : "未找到 body");
console.log(
	"\nbody.enable-banner:",
	bodyTag && /enable-banner/.test(bodyTag[0]) ? "有（横幅启用）" : "没有（横幅停用）",
);

console.log("\n=== 移动端 banner 图槽位 ===");
const slot = dom.match(/<div class="[^"]*banner-image-slot-mobile[^"]*"[^>]*>/);
console.log(slot ? slot[0] : "未找到");
