/** 一个相册（对应 Supabase 里 album_groups 表的一行） */
export interface AlbumGroupRow {
	id: number;
	/** 相册名，同时作为前台展示的标题 */
	title: string;
	description: string;
	/** 封面图地址。上传第一张照片时自动设为它，之后可在管理页更换 */
	cover: string | null;
	created_at: string;
}

/** 一张照片（对应 Supabase 里 album_photos 表的一行） */
export interface AlbumPhotoRow {
	id: number;
	/** 所属相册 id */
	album_id: number;
	/** 原图公开地址 */
	src: string;
	/** 缩略图公开地址，列表用它显示，点开看原图 */
	thumbnail: string;
	title: string;
	description: string;
	created_at: string;
}

/** 前台渲染用的相册（含它的照片） */
export interface AlbumWithPhotos {
	album: AlbumGroupRow;
	photos: AlbumPhotoRow[];
}

/**
 * 嵌套查询返回的原始行：相册字段 + 内嵌的照片数组。
 * PostgREST 用外键名 `album_photos` 作为内嵌字段，所以要和 AlbumWithPhotos 区分开。
 */
export interface AlbumRowWithPhotos extends AlbumGroupRow {
	album_photos: AlbumPhotoRow[] | null;
}

/** 上传一张照片时要提交的字段 */
export interface PhotoUploadInput {
	albumId: number;
	src: string;
	thumbnail: string;
	title: string;
	description: string;
}
