export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[];
	certifications?: string[];
	color?: string;
}

// 技能数据。level 和 experience 纯属自评，写的是真实水平：
// 大三在读，都是自己瞎折腾出来的，谈不上精通。
export const skillsData: Skill[] = [
	{
		id: "html-css",
		name: "HTML / CSS",
		description:
			"页面能摆出来，但「为什么这个 div 不居中」依然是我每天要问一遍的问题。",
		icon: "logos:html-5",
		category: "frontend",
		level: "beginner",
		experience: {
			years: 1,
			months: 6,
		},
		color: "#E34F26",
	},
	{
		id: "javascript",
		name: "JavaScript",
		description:
			"能写能跑，报错就 console.log 一路打过去。至于 this 指向谁，看运气。",
		icon: "logos:javascript",
		category: "frontend",
		level: "beginner",
		experience: {
			years: 1,
			months: 2,
		},
		color: "#F7DF1E",
	},
	{
		id: "typescript",
		name: "TypeScript",
		description:
			"喜欢它的类型提示，但也经常对着红色的波浪线发呆，最后选择 as any。",
		icon: "logos:typescript-icon",
		category: "frontend",
		level: "beginner",
		experience: {
			years: 0,
			months: 8,
		},
		color: "#3178C6",
	},
	{
		id: "python",
		name: "Python",
		description:
			"主要用来交作业和爬点东西。写的时候很爽，过两周回来看不懂自己写了什么。",
		icon: "logos:python",
		category: "backend",
		level: "beginner",
		experience: {
			years: 1,
			months: 0,
		},
		color: "#3776AB",
	},
	{
		id: "c-cpp",
		name: "C / C++",
		description:
			"课程要求学的。指针是我的老朋友，也是我段错误的老朋友。",
		icon: "logos:c-plusplus",
		category: "backend",
		level: "beginner",
		experience: {
			years: 1,
			months: 0,
		},
		color: "#00599C",
	},
	{
		id: "git",
		name: "Git",
		description:
			"会 add、commit、push 三连。一旦要 rebase 或者救回删错的分支，就开始搜索引擎之旅。",
		icon: "logos:git-icon",
		category: "tools",
		level: "beginner",
		experience: {
			years: 1,
			months: 0,
		},
		color: "#F05032",
	},
	{
		id: "linux",
		name: "Linux",
		description:
			"能装系统、连 SSH、改配置文件。每次敲 rm 之前都会先深呼吸一下。",
		icon: "logos:linux-tux",
		category: "tools",
		level: "beginner",
		experience: {
			years: 0,
			months: 10,
		},
		color: "#FCC624",
	},
	{
		id: "markdown",
		name: "Markdown",
		description: "唯一一个我敢说自己很熟练的东西，毕竟写笔记和写这个博客都用它。",
		icon: "logos:markdown",
		category: "tools",
		level: "intermediate",
		experience: {
			years: 2,
			months: 0,
		},
		color: "#000000",
	},
];
