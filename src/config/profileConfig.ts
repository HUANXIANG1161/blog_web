import type { ProfileConfig } from "../types/config";

// 个人资料配置
export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.webp", // 相对于 /src 目录。如果以 '/' 开头，则相对于 /public 目录
	name: "幻想1161",
	bio: "记录技术折腾、日常和一些没什么用的想法。",
	typewriter: {
		enable: true, // 启用个人简介打字机效果
		speed: 80, // 打字速度（毫秒）
	},
	links: [
		{
			name: "Bilibili",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/101263758",
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/TODO-your-github", // TODO: 换成你自己的 GitHub 主页，没有可以删掉这一项
		},
	],
};
