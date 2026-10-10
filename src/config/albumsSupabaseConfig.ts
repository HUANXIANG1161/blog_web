/**
 * 相册的 Supabase 配置
 *
 * 与日记相同的权限模型：匿名只读，写入需要登录（只有站长能传图）。
 * 建表 SQL 见 docs/ALBUMS.md。
 */
export interface AlbumsSupabaseConfig {
	/** 是否用 Supabase 作为相册数据源 */
	enable: boolean;

	/** 一页显示多少个相册 */
	pageSize: number;

	/**
	 * 缩略图的目标宽度（像素），高度按比例。
	 * 列表用缩略图显示，点开看原图 —— 手机直出的大图不压缩会很卡。
	 */
	thumbnailWidth: number;

	/** 缩略图压缩质量（0-1） */
	thumbnailQuality: number;

	/** 原图大小上限（字节），默认 20MB（手机原图常见 5-10MB） */
	imageMaxBytes: number;

	/** 允许的图片 MIME 类型 */
	imageAllowedTypes: string[];

	/** 相册名最大长度 */
	titleMaxLength: number;

	/** 照片标题、描述的最大长度 */
	photoTitleMaxLength: number;
	photoDescriptionMaxLength: number;
}

export const albumsSupabaseConfig: AlbumsSupabaseConfig = {
	enable: true,

	pageSize: 24,

	// 800px 宽的缩略图在卡片里足够清晰，体积通常只有原图的 5%~10%
	thumbnailWidth: 800,
	thumbnailQuality: 0.82,

	imageMaxBytes: 20 * 1024 * 1024,
	imageAllowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],

	titleMaxLength: 60,
	photoTitleMaxLength: 100,
	photoDescriptionMaxLength: 500,
};
