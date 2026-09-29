// 日记数据配置
// 用于管理日记页面的数据
//
// 想加一条日记就在下面数组里追加，字段含义：
//   id       必填，唯一数字
//   content  必填，正文
//   date     必填，建议带时区，例如 "2026-09-29T20:30:00+08:00"
//   images   可选，图片路径数组（相对 public/，如 "/images/diary/1.webp"）
//   location / mood / tags  可选
//
// 注意：日记页若在 siteConfig.diaryApiUrl 配了 Memos 地址，会优先走 Memos，这里的静态数据不显示。

export interface DiaryItem {
	id: number;
	content: string;
	date: string;
	images?: string[];
	location?: string;
	mood?: string;
	tags?: string[];
}

const diaryData: DiaryItem[] = [
	{
		id: 1,
		content: "我怎么知道",
		date: "2026-09-29T17:06:00+08:00",
	},
];

// 获取日记列表（按时间倒序）
export const getDiaryList = (limit?: number) => {
	const sortedData = [...diaryData].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	if (limit && limit > 0) {
		return sortedData.slice(0, limit);
	}

	return sortedData;
};

// 获取所有标签
export const getAllTags = () => {
	const tags = new Set<string>();
	for (const item of diaryData) {
		if (item.tags) {
			for (const tag of item.tags) {
				tags.add(tag);
			}
		}
	}
	return Array.from(tags).sort();
};
