export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// 友链列表。想加谁就直接往数组里追加一项，id 保持唯一即可。
// 下面先放几个本站用到的项目，换成真正的朋友链接后删掉就行。
export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "Astro",
		imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
		desc: "本站使用的静态站点框架，内容优先、默认零 JS。",
		siteurl: "https://astro.build",
		tags: ["框架", "静态站点"],
	},
	{
		id: 2,
		title: "Mizuki",
		imgurl: "https://avatars.githubusercontent.com/u/152655207?v=4&s=640",
		desc: "本站主题的上游项目。",
		siteurl: "https://github.com/LyraVoid/Mizuki",
		tags: ["主题", "开源"],
	},
	{
		id: 3,
		title: "幻想1161 的 B 站",
		imgurl: "https://www.bilibili.com/favicon.ico",
		desc: "主要发几个虫子。",
		siteurl: "https://space.bilibili.com/101263758",
		tags: ["个人", "视频"],
	},
];

// 获取所有友情链接数据
export function getFriendsList(): FriendItem[] {
	return friendsData;
}

// 获取随机排序的友情链接数据
export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
