/**
 * 留言板配置
 *
 * 留言数据保存在 Supabase（数据库 + 对象存储），前端直接调用它的 API，
 * 所以本站仍然是纯静态站，不需要自己的服务端。
 *
 * 启用步骤见 docs/GUESTBOOK.md，简单说：
 *   1. 建一个 Supabase 项目
 *   2. 在 SQL Editor 里跑一遍建表和权限策略
 *   3. 把项目地址和 anon key 填到 .env 里
 *   4. 把下面的 enable 改成 true
 */

export interface GuestbookConfig {
	/** 功能总开关。未配置 Supabase 时保持 false，页面不会被创建 */
	enable: boolean;

	/** 留言须知栏的正文，支持 Markdown 风格的列表（每条一行，以 - 开头） */
	rules: string[];

	/** 一页显示多少条留言 */
	pageSize: number;

	/** 昵称最大长度 */
	nameMaxLength: number;

	/** 留言内容最大长度 */
	messageMaxLength: number;

	/** 单张图片大小上限（字节），默认 2MB。同时要在 Supabase 存储桶上设置同样或更小的限制 */
	imageMaxBytes: number;

	/** 允许的图片 MIME 类型 */
	imageAllowedTypes: string[];

	/**
	 * 是否显示人机验证。
	 * 开启前需要在 Supabase 后台 Authentication -> Attack Protection 里
	 * 配置 hCaptcha 的 Secret，并在下面填对应的 Site Key。
	 */
	captcha: {
		enable: boolean;
		/** hCaptcha 的 Site Key（公开值，可以写进前端） */
		siteKey: string;
	};
}

export const guestbookConfig: GuestbookConfig = {
	enable: true,

	rules: [
		"友善发言，可以吐槽但别骂人。",
		"可以留网址，但别来打广告。",
		"图片请控制在 2MB 以内，支持 JPG / PNG / WebP / GIF。",
		"留言会先经过人机验证，通过后立即显示。",
		"看到不爽的留言我会直接删，不另行通知。",
	],

	pageSize: 20,
	nameMaxLength: 32,
	messageMaxLength: 500,
	imageMaxBytes: 2 * 1024 * 1024,
	imageAllowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],

	captcha: {
		enable: true,
		// TODO: 填 hCaptcha 的 Site Key
		siteKey: "",
	},
};
