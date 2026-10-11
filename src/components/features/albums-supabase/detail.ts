/**
 * 相册详情页的初始化逻辑
 *
 * 为什么单独抽成模块而不是写在 .astro 的 <script> 里：
 *   站点用 Swup 做无刷新跳转。Swup 会把新页面的 <script> 标签插进 DOM，
 *   但浏览器不会重新执行 URL 相同的 ES 模块 —— 所以页面脚本本身靠不住
 *   （实测只请求了页面和脚本标签，模块依赖一个都没加载，逻辑一次都没跑）。
 *
 *   这里由页面脚本 import 本模块并调用 initAlbumDetailPage()，
 *   而本函数自己负责等待容器出现（事件 + 轮询兜底），
 *   这样无论首次加载还是 Swup 跳转进来都能正确初始化。
 */
import {
	fetchAlbumById,
	fetchAlbumPhotos,
	isAlbumsSupabaseConfigured,
} from "./client";
import type { AlbumPhotoRow } from "./types";

const POLL_INTERVAL_MS = 100;
const POLL_MAX_TICKS = 150; // 约 15 秒后放弃

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/**
 * 初始化详情页。可以重复调用（首次加载、Swup 跳转、内联脚本兜底都会调），
 * 靠下面的 started 标记保证数据只拉一次。
 */
export function initAlbumDetailPage(): void {
	let started = false;

	function boot(): void {
		if (started) return;
		if (!document.getElementById("album-detail")) return;
		started = true;
		void run();
	}

	// 立刻试一次：脚本执行时容器可能已经在了
	boot();

	// Swup 跳转后容器才会出现，事件时序不保证，所以事件 + 轮询双保险。
	// 轮询在拿到容器后自行停止；若一直没进详情页，最多跑 15 秒。
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot);
	}
	document.addEventListener("swup:page:view", boot);
	document.addEventListener("swup:visit:end", boot);

	let ticks = 0;
	const timer = window.setInterval(() => {
		boot();
		if (started || ++ticks > POLL_MAX_TICKS) window.clearInterval(timer);
	}, POLL_INTERVAL_MS);
}

async function run(): Promise<void> {
	const runtime = document.getElementById("album-runtime")?.dataset;
	const loading = document.getElementById("album-detail-loading");
	const errorBox = document.getElementById("album-detail-error");
	const errorText = document.getElementById("album-detail-error-text");
	const detail = document.getElementById("album-detail");

	function showError(message: string): void {
		loading?.classList.add("hidden");
		detail?.classList.add("hidden");
		errorBox?.classList.remove("hidden");
		if (errorText) errorText.textContent = message;
	}

	if (runtime?.supabaseEnabled !== "true") return;

	if (!isAlbumsSupabaseConfigured()) {
		showError(runtime?.loadFailed || "not configured");
		return;
	}

	// 从查询参数取 id：/albums/view/?id=12
	const params = new URLSearchParams(window.location.search);
	const rawId = params.get("id") ?? "";
	const albumId = Number(rawId);
	if (!rawId || !Number.isFinite(albumId)) {
		showError(runtime?.notFound || "not found");
		return;
	}

	try {
		const album = await fetchAlbumById(albumId);
		if (!album) {
			showError(runtime?.notFound || "not found");
			return;
		}

		const photos = await fetchAlbumPhotos(albumId);

		// ── 头部 ──────────────────────────────────────────
		const cover = album.cover || photos[0]?.thumbnail || "";
		const coverImg = document.getElementById("album-cover") as HTMLImageElement | null;
		if (cover && coverImg) {
			coverImg.src = cover;
			coverImg.alt = album.title;
		} else {
			document.getElementById("album-cover-wrap")?.classList.add("hidden");
		}

		const titleEl = document.getElementById("album-title");
		if (titleEl) titleEl.textContent = album.title;

		if (album.description) {
			const descEl = document.getElementById("album-description");
			if (descEl) {
				descEl.textContent = album.description;
				descEl.classList.remove("hidden");
			}
		}

		const countEl = document.getElementById("album-count");
		if (countEl) countEl.textContent = String(photos.length);

		// ── 照片 ──────────────────────────────────────────
		renderPhotos(album.id, photos);

		loading?.classList.add("hidden");
		detail?.classList.remove("hidden");
	} catch (error) {
		console.error("[album-detail] 加载失败:", error);
		showError(runtime?.loadFailed || "load failed");
	}
}

function renderPhotos(albumId: number, photos: AlbumPhotoRow[]): void {
	const grid = document.getElementById("album-photos");
	const emptyEl = document.getElementById("album-photos-empty");
	if (!grid) return;

	if (photos.length === 0) {
		grid.innerHTML = "";
		emptyEl?.classList.remove("hidden");
		return;
	}

	grid.innerHTML = photos
		.map(
			(photo, index) => `<div class="gallery-masonry-item">
	<div data-fancybox="album-${albumId}" data-src="${escapeHtml(photo.src)}" data-caption="${escapeHtml(photo.title || photo.description || "")}" data-type="image" class="block rounded-xl overflow-hidden group cursor-pointer">
		<img src="${escapeHtml(photo.thumbnail || photo.src)}" alt="${escapeHtml(photo.title)}" loading="${index < 6 ? "eager" : "lazy"}" decoding="async" class="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" />
	</div>
	${
		photo.title || photo.description
			? `<div class="px-1 pt-2 pb-1"><div data-photo-title class="text-sm font-medium text-black/80 dark:text-white/80">${escapeHtml(photo.title)}</div>${
					photo.description
						? `<div data-photo-desc class="text-xs text-black/50 dark:text-white/50 mt-0.5">${escapeHtml(photo.description)}</div>`
						: ""
				}</div>`
			: ""
	}
</div>`,
		)
		.join("");

	emptyEl?.classList.add("hidden");
}
