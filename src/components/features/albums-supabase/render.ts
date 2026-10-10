/**
 * 相册卡的渲染
 *
 * 相册数据存在 Supabase，构建时拿不到，所以列表在客户端拉取后由这里生成 HTML。
 * 输出的结构与 AlbumCard.astro 保持一致，这样样式和筛选栏都能直接复用。
 */
import type { AlbumWithPhotos } from "./types";

export interface AlbumRenderLabels {
	/** 「N 张」里的量词，来自 i18n */
	photosLabel: string;
}

function escapeHtml(value: unknown): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return String(value ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

function formatDate(value: string | null, fallback: string): string {
	const raw = value || fallback;
	if (!raw) return "";
	const time = new Date(raw).getTime();
	if (Number.isNaN(time)) return "";
	return new Date(raw).toLocaleDateString("zh-CN");
}

/** 生成一张相册卡（对应 AlbumCard.astro 的结构） */
function renderAlbumCard(
	{ album, photos }: AlbumWithPhotos,
	labels: AlbumRenderLabels,
): string {
	// 封面优先用手动设置的，其次用第一张照片的缩略图
	const cover = album.cover || photos[0]?.thumbnail || "";

	const coverHtml = cover
		? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(album.title)}" class="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />`
		: `<div class="w-full h-full bg-(--btn-regular-bg) flex items-center justify-center"><iconify-icon icon="material-symbols:photo-library" class="text-5xl text-black/20 dark:text-white/20"></iconify-icon></div>`;

	const tagsHtml =
		album.location &&
		`<div class="flex items-center gap-3 text-xs text-white/70 mt-1.5 flex-wrap"><span class="inline-flex items-center gap-0.5">${escapeHtml(album.location)}</span></div>`;

	return `<a href="/albums/view/?id=${album.id}" class="album-card group relative block overflow-hidden rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
	<div class="aspect-4/3 relative overflow-hidden">
		${coverHtml}
		<div class="absolute top-2 right-2 flex items-center gap-1.5">
			<div class="px-2 py-1 rounded-full text-xs text-white font-medium bg-black/50 backdrop-blur-sm">${photos.length} ${escapeHtml(labels.photosLabel)}</div>
		</div>
		<div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>
		<div class="absolute bottom-0 left-0 right-0 p-4">
			<h3 class="font-bold text-base text-white line-clamp-1 drop-shadow-lg">${escapeHtml(album.title)}</h3>
			${album.description ? `<p class="text-xs text-white/75 line-clamp-1 mt-1 leading-relaxed" title="${escapeHtml(album.description)}">${escapeHtml(album.description)}</p>` : ""}
			<div class="flex items-center gap-3 text-xs text-white/70 mt-1.5 flex-wrap">
				<span>${escapeHtml(formatDate(album.date, album.created_at))}</span>
			</div>
			${tagsHtml}
		</div>
	</div>
</a>`;
}

export interface RenderAlbumsOptions {
	albums: AlbumWithPhotos[];
	labels: AlbumRenderLabels;
}

/**
 * 把相册渲染进列表，并切换空状态。
 * 返回渲染出的相册数量，方便调用方决定是否显示筛选栏。
 */
export function renderAlbums({
	albums,
	labels,
}: RenderAlbumsOptions): number {
	const grid = document.getElementById("albums-grid");
	const empty = document.getElementById("albums-empty");
	const loading = document.getElementById("albums-loading");
	if (!grid) return 0;

	loading?.classList.add("hidden");

	if (albums.length === 0) {
		grid.innerHTML = "";
		empty?.classList.remove("hidden");
		return 0;
	}

	grid.innerHTML = albums.map((item) => renderAlbumCard(item, labels)).join("");
	empty?.classList.add("hidden");
	return albums.length;
}

/** 显示加载态：清空列表与空状态，避免同时出现 */
export function showAlbumsLoading(): void {
	document.getElementById("albums-loading")?.classList.remove("hidden");
	document.getElementById("albums-empty")?.classList.add("hidden");
}

/** 显示错误提示 */
export function showAlbumsError(message: string): void {
	const loading = document.getElementById("albums-loading");
	const empty = document.getElementById("albums-empty");
	loading?.classList.add("hidden");

	if (empty) {
		empty.classList.remove("hidden");
		const title = empty.querySelector("h3");
		const desc = empty.querySelector("p");
		if (title) title.textContent = message;
		if (desc) desc.textContent = "";
	}
}
