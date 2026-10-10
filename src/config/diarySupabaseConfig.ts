/**
 * 日记的 Supabase 配置
 *
 * 与留言板的区别在权限设计：
 *   留言板 —— 匿名可读可写（靠人机验证和蜜罐防刷）
 *   日记   —— 匿名只读，写入需要登录（只有站长自己能写）
 *
 * 这是通过数据库的行级安全策略实现的：diary_entries 表开启 RLS 后，
 * 只给 anon 角色 select 权限，insert / update / delete 只给 authenticated。
 * 建表 SQL 见 docs/DIARY.md。
 */
export interface DiarySupabaseConfig {
	/**
	 * 是否用 Supabase 作为日记数据源。
	 * 关闭时日记页只显示 src/data/diary.ts 里的静态数据。
	 */
	enable: boolean;

	/** 一页显示多少条 */
	pageSize: number;

	/** 正文最大长度 */
	contentMaxLength: number;

	/** 单条日记最多几张图 */
	maxImagesPerEntry: number;

	/** 单张图片大小上限（字节），默认 5MB，日记配图通常比留言图大 */
	imageMaxBytes: number;

	/** 允许的图片 MIME 类型 */
	imageAllowedTypes: string[];
}

export const diarySupabaseConfig: DiarySupabaseConfig = {
	enable: true,

	pageSize: 20,
	contentMaxLength: 2000,
	maxImagesPerEntry: 9,
	imageMaxBytes: 5 * 1024 * 1024,
	imageAllowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};
