export interface Skill {
	id: string;
	name: string;
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
