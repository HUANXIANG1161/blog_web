/**
 * 日记卡片的渲染管线
 *
 * 抽出来是因为日记页有三种数据源：构建时的静态数据、Supabase、以及可选的 Memos，
 * 三者最终都要渲染成同一种卡片。放在这里避免把这段 DOM 拼接逻辑复制三份。
 *
 * 输入统一是 DiaryItem 结构，所以各数据源只需要负责把数据映射成这个形状。
 */
import type { DiaryItem } from "@/data/diary";
import { formatRelativeTime } from "@/utils/timeFormat";

export interface DiaryRenderLabels {
	minutesAgo: string;
	hoursAgo: string;
	daysAgo: string;
}

/** 转义后再拼进 innerHTML —— 日记内容来自数据库，必须当作不可信输入处理 */
export function escapeHtml(text: unknown): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return String(text ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

/** 按图片数量选择布局类名，与 MomentCard 的静态渲染保持一致 */
function getImageLayoutClass(count: number): string {
	if (count === 1) return "diary-images-single";
	if (count === 2) return "diary-images-double";
	if (count === 3) return "diary-images-triple";
	return "diary-images-grid";
}

export function renderMomentCards(
	moments: DiaryItem[],
	labels: DiaryRenderLabels,
): string {
	return moments
		.map((moment, index) => {
			const relativeTime = formatRelativeTime(
				moment.date,
				labels.minutesAgo,
				labels.hoursAgo,
				labels.daysAgo,
			);
			const tagsAttr = escapeHtml((moment.tags || []).join(","));

			let imagesHtml = "";
			if (moment.images && moment.images.length > 0) {
				const layoutClass = getImageLayoutClass(moment.images.length);
				const imgs = moment.images
					.map(
						(img, i) =>
							'<div class="relative rounded-lg overflow-hidden aspect-square cursor-pointer">' +
							'<a href="javascript:void(0)" data-src="' +
							escapeHtml(img) +
							'" data-fancybox="diary-' +
							index +
							"-" +
							i +
							'" class="block w-full h-full">' +
							'<img src="' +
							escapeHtml(img) +
							'" alt="diary moment image" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" decoding="async" />' +
							"</a></div>",
					)
					.join("");
				imagesHtml =
					'<div class="diary-images grid gap-2 mb-3 ' +
					layoutClass +
					'">' +
					imgs +
					"</div>";
			}

			let tagsHtml = "";
			if (moment.tags && moment.tags.length > 0) {
				const tagSpans = moment.tags
					.map(
						(tag) =>
							'<span class="btn-regular h-6 text-xs px-2 rounded-lg">' +
							escapeHtml(tag) +
							"</span>",
					)
					.join("");
				tagsHtml =
					'<div class="flex flex-wrap gap-1.5 mb-3">' + tagSpans + "</div>";
			}

			const locationHtml = moment.location
				? '<span class="flex items-center gap-1"><iconify-icon icon="material-symbols:location-on" class="text-xs w-3.5 h-3.5"></iconify-icon>' +
					escapeHtml(moment.location) +
					"</span>"
				: "";

			return (
				'<div class="moment-card group relative bg-transparent rounded-xl border border-black/10 dark:border-white/10 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1" data-tags="' +
				tagsAttr +
				'">' +
				'<div class="p-5">' +
				'<p class="text-sm md:text-base text-black/90 dark:text-white/90 leading-relaxed mb-3">' +
				escapeHtml(moment.content) +
				"</p>" +
				imagesHtml +
				tagsHtml +
				'<hr class="border-t border-black/5 dark:border-white/5 my-3" />' +
				'<div class="flex items-center justify-between text-xs text-black/50 dark:text-white/50 flex-wrap gap-2">' +
				'<div class="flex items-center gap-1.5">' +
				'<iconify-icon icon="material-symbols:schedule" class="text-xs w-3.5 h-3.5"></iconify-icon>' +
				'<time datetime="' +
				escapeHtml(moment.date) +
				'">' +
				relativeTime +
				"</time>" +
				"</div>" +
				'<div class="flex items-center gap-3">' +
				locationHtml +
				"</div>" +
				"</div>" +
				"</div>" +
				'<div class="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div>' +
				"</div>"
			);
		})
		.join("");
}

/** 重建标签筛选栏，并重新初始化筛选交互 */
export function rebuildFilterTabs(moments: DiaryItem[]): void {
	let filterContainer = document.querySelector(".filter-tabs");
	if (!filterContainer) {
		// 静态渲染时没有筛选栏（没有日记或没有标签），这里补建一个
		const contentArea = document.querySelector(
			".card-base .px-6.sm\\:px-9.pt-2.pb-6",
		);
		if (!contentArea) return;
		filterContainer = document.createElement("div");
		filterContainer.className = "filter-tabs mb-8";
		contentArea.insertBefore(filterContainer, contentArea.firstChild);
	}

	const allTags: string[] = [];
	const seen: Record<string, boolean> = {};
	for (const moment of moments) {
		for (const tag of moment.tags || []) {
			if (!seen[tag]) {
				seen[tag] = true;
				allTags.push(tag);
			}
		}
	}

	// 空容器直接清掉，避免留下一条空白
	if (allTags.length === 0) {
		filterContainer.innerHTML = "";
		return;
	}

	filterContainer.innerHTML = "";
	for (const tag of allTags) {
		const count = moments.filter((m) => (m.tags || []).includes(tag)).length;
		const tab = document.createElement("button");
		tab.className = "filter-tab";
		tab.setAttribute("data-filter-value", tag);
		tab.setAttribute("data-filter-attr", "tags");
		tab.innerHTML =
			"<span>" +
			escapeHtml(tag) +
			'</span><span class="count">' +
			count +
			"</span>";
		filterContainer.appendChild(tab);
	}

	const win = window as Window & { __initFilterTabs?: () => void };
	if (typeof win.__initFilterTabs === "function") {
		win.__initFilterTabs();
	}
}

/** 更新头部卡片上的条数 */
export function updateCountDisplay(count: number): void {
	const countEl = document.querySelector(".card-base .shrink-0 .text-2xl");
	if (countEl) countEl.textContent = String(count);
}

/**
 * 把日记列表渲染进页面：替换卡片、更新条数、重建筛选栏。
 * 三种数据源共用这一个出口。
 */
export function renderDiaryList(
	moments: DiaryItem[],
	labels: DiaryRenderLabels,
): void {
	const container = document.getElementById("diary-list");
	if (!container) return;

	container.innerHTML = renderMomentCards(moments, labels);
	updateCountDisplay(moments.length);
	rebuildFilterTabs(moments);
}
