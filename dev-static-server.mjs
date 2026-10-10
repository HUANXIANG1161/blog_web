// 极简静态文件服务器，用于本地验证构建产物
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve("dist");
const PORT = Number(process.argv[2] || 4173);

const TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".xml": "application/xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".webp": "image/webp",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".mp3": "audio/mpeg",
};

const server = http.createServer((req, res) => {
	let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
	if (urlPath.endsWith("/")) urlPath += "index.html";

	const filePath = path.join(ROOT, urlPath);
	if (!filePath.startsWith(ROOT)) {
		res.writeHead(403).end("forbidden");
		return;
	}

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404, { "content-type": "text/plain" }).end("404");
			return;
		}
		const type =
			TYPES[path.extname(filePath).toLowerCase()] ||
			"application/octet-stream";
		res.writeHead(200, { "content-type": type }).end(data);
	});
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`静态服务器已启动: http://127.0.0.1:${PORT}/  (root=${ROOT})`);
});
