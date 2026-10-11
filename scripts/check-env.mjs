/**
 * 构建前检查 Supabase 环境变量。
 *
 * 为什么需要：缺少这两个变量时构建依然会「成功」，但产物里 url 是 undefined，
 * 线上的留言板、日记、相册会全部静默失效 —— 部署完点开才发现。
 *
 * 为什么单独一个脚本，而不是写在 astro.config.mjs 里：
 *   Astro 求值配置文件发生在 .env 被加载之前，那时 import.meta.env 和
 *   process.env 都读不到这些变量（实测两者都是空的）。而 prebuild 脚本
 *   由 Node 直接执行，可以自己读 .env；托管平台注入的环境变量也已经在
 *   process.env 里。两条路径都能覆盖。
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = ["PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_ANON_KEY"];

if (process.env.SKIP_SUPABASE_ENV_CHECK === "1") {
	console.log("[check-env] 已按 SKIP_SUPABASE_ENV_CHECK=1 跳过检查");
	process.exit(0);
}

/** 极简 .env 解析：够用即可（不支持多行值和变量插值） */
function parseEnvFile(path) {
	const out = {};
	if (!existsSync(path)) return out;
	for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
}

const fromFile = {
	...parseEnvFile(resolve(process.cwd(), ".env")),
	...parseEnvFile(resolve(process.cwd(), ".env.local")),
};

const missing = REQUIRED.filter((key) => {
	const value = process.env[key] ?? fromFile[key];
	return !value || !String(value).trim();
});

if (missing.length === 0) {
	console.log("[check-env] Supabase 环境变量检查通过");
	process.exit(0);
}

console.error("");
console.error(`  ✗ 缺少环境变量：${missing.join("、")}`);
console.error("");
console.error("  留言板、日记、相册都依赖 Supabase。缺少配置时页面会静默失效：");
console.error("  构建能过，但线上这些页面全部加载不出来。");
console.error("");
console.error("  本地：在项目根目录的 .env 里填写（参考 .env.example）。");
console.error("  线上：托管平台的环境变量里也要配置 —— .env 被 gitignore 忽略，");
console.error("        构建机器读不到，只能靠平台自己的环境变量设置。");
console.error("");
console.error("  确实想跳过检查：设置 SKIP_SUPABASE_ENV_CHECK=1");
console.error("");
process.exit(1);
