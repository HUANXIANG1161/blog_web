/** 一条日记（对应 Supabase 里 diary_entries 表的一行） */
export interface DiaryEntry {
	id: number;
	/** 正文 */
	content: string;
	/** 图片公开地址数组，没有图片时为空数组 */
	images: string[];
	/** 标签，用于日记页的筛选栏 */
	tags: string[];
	/** 写入时间，ISO 8601 字符串 */
	created_at: string;
}

/** 提交日记时的字段（id 和时间由数据库生成） */
export interface DiaryEntryInput {
	content: string;
	images: string[];
	tags: string[];
}
