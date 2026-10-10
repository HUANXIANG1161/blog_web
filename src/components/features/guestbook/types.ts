/** 一条留言（对应 Supabase 里 guestbook_messages 表的一行） */
export interface GuestbookMessage {
	id: number;
	/** 留言者昵称 */
	name: string;
	/** 留言正文 */
	content: string;
	/** 附带图片的公开访问地址，没有图片时为 null */
	image_url: string | null;
	/** 写入时间，ISO 8601 字符串 */
	created_at: string;
}

/** 提交留言时用到的字段（id 和时间由数据库生成） */
export interface GuestbookMessageInput {
	name: string;
	content: string;
	image_url: string | null;
	/** hCaptcha 通过后拿到的 token，未开启验证时为 null */
	captchaToken: string | null;
}

/** 留言列表的加载状态 */
export type GuestbookLoadState = "idle" | "loading" | "ready" | "error";
