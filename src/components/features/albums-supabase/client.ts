/**
 * 相册的数据访问层
 *
 * 权限模型与日记一致：匿名只读，写入需要登录。
 *   album_groups / album_photos 只给 anon 角色 select，
 *   insert/update/delete 只给 authenticated
 *
 * 建表 SQL 与配置步骤见 docs/ALBUMS.md。
 */
import { albumsSupabaseConfig } from "@/config";
import {
	createSupabaseClient,
	isSupabaseConfigured,
	uploadImage,
} from "@/utils/supabase-client";
import type {
	AlbumGroupRow,
	AlbumPhotoRow,
	AlbumWithPhotos,
	PhotoUploadInput,
} from "./types";

/** 数据库表名 */
const GROUPS_TABLE = "album_groups";
const PHOTOS_TABLE = "album_photos";
/** 图片存储桶名 */
const BUCKET = "albums";

const GROUP_COLUMNS = "id,title,description,location,date,cover,created_at";
const PHOTO_COLUMNS =
	"id,album_id,src,thumbnail,title,description,created_at";

/** Supabase 是否已经配置好 */
export const isAlbumsSupabaseConfigured = isSupabaseConfigured;

/** 上传一张图片（原图或缩略图），返回公开访问地址 */
export function uploadAlbumImage(
	file: File | Blob,
	prefix: string,
): Promise<string> {
	// Blob 没有文件名，包成 File 并给个 .jpg 名字，
	// 否则 uploadImage 会因为取不到扩展名而退回 .png
	const named =
		file instanceof File
			? file
			: new File([file], `${prefix}.jpg`, { type: "image/jpeg" });

	return uploadImage(BUCKET, named, {
		allowedTypes: albumsSupabaseConfig.imageAllowedTypes,
		maxBytes: albumsSupabaseConfig.imageMaxBytes,
		prefix,
		requireAuth: true,
	});
}

// ─── 公开页面用：匿名读取 ──────────────────────────────────────

/** 读取相册列表，按日期倒序（没有 date 的用创建时间） */
export async function fetchAlbums(
	offset = 0,
	limit = albumsSupabaseConfig.pageSize,
): Promise<AlbumGroupRow[]> {
	const supabase = createSupabaseClient();
	const { data, error } = await supabase
		.from(GROUPS_TABLE)
		.select(GROUP_COLUMNS)
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return (data ?? []) as AlbumGroupRow[];
}

/** 读取单个相册，不存在时返回 null */
export async function fetchAlbumById(
	id: number,
): Promise<AlbumGroupRow | null> {
	const supabase = createSupabaseClient();
	const { data, error } = await supabase
		.from(GROUPS_TABLE)
		.select(GROUP_COLUMNS)
		.eq("id", id)
		.maybeSingle();

	if (error) throw error;
	return (data as AlbumGroupRow | null) ?? null;
}

/** 读取某个相册下的全部照片，按上传时间正序 */
export async function fetchAlbumPhotos(
	albumId: number,
): Promise<AlbumPhotoRow[]> {
	const supabase = createSupabaseClient();
	const { data, error } = await supabase
		.from(PHOTOS_TABLE)
		.select(PHOTO_COLUMNS)
		.eq("album_id", albumId)
		.order("created_at", { ascending: true });

	if (error) throw error;
	return (data ?? []) as AlbumPhotoRow[];
}

/**
 * 一次性读取相册列表页需要的数据：每个相册 + 它的照片。
 *
 * 没有用嵌套 select，因为那样返回的形状不稳定；这里查两次再在内存里归并，
 * 相册数量是几十的量级，两次查询足够了。
 */
export async function fetchAlbumsWithPhotos(): Promise<AlbumWithPhotos[]> {
	const albums = await fetchAlbums(0, 200);
	if (albums.length === 0) return [];

	const supabase = createSupabaseClient();
	const { data, error } = await supabase
		.from(PHOTOS_TABLE)
		.select(PHOTO_COLUMNS)
		.in(
			"album_id",
			albums.map((a) => a.id),
		)
		.order("created_at", { ascending: true });

	if (error) throw error;

	const byAlbum = new Map<number, AlbumPhotoRow[]>();
	for (const photo of (data ?? []) as AlbumPhotoRow[]) {
		const list = byAlbum.get(photo.album_id);
		if (list) list.push(photo);
		else byAlbum.set(photo.album_id, [photo]);
	}

	return albums.map((album) => ({
		album,
		photos: byAlbum.get(album.id) ?? [],
	}));
}

// ─── 管理页用：需要登录 ────────────────────────────────────────

function adminClient() {
	return createSupabaseClient({ persistSession: true });
}

/** 新建相册，返回新记录。cover 允许为空，传第一张照片后再更新 */
export async function createAlbum(input: {
	title: string;
	description: string;
	location: string;
	date: string | null;
}): Promise<AlbumGroupRow> {
	const supabase = adminClient();
	const { data, error } = await supabase
		.from(GROUPS_TABLE)
		.insert({
			title: input.title,
			description: input.description,
			location: input.location,
			date: input.date,
		})
		.select(GROUP_COLUMNS)
		.single();

	if (error) throw error;
	return data as AlbumGroupRow;
}

/** 修改相册信息 */
export async function updateAlbum(
	id: number,
	input: {
		title?: string;
		description?: string;
		location?: string;
		date?: string | null;
		cover?: string | null;
	},
): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase
		.from(GROUPS_TABLE)
		.update(input)
		.eq("id", id);
	if (error) throw error;
}

/**
 * 删除相册。
 * 照片行靠外键的 on delete cascade 一起删掉，
 * 但存储桶里的图片文件不会自动删（需要另外处理，见 docs/ALBUMS.md）。
 */
export async function deleteAlbum(id: number): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase.from(GROUPS_TABLE).delete().eq("id", id);
	if (error) throw error;
}

/** 往相册里加一张照片 */
export async function createPhoto(
	input: PhotoUploadInput,
): Promise<AlbumPhotoRow> {
	const supabase = adminClient();
	const { data, error } = await supabase
		.from(PHOTOS_TABLE)
		.insert({
			album_id: input.albumId,
			src: input.src,
			thumbnail: input.thumbnail,
			title: input.title,
			description: input.description,
		})
		.select(PHOTO_COLUMNS)
		.single();

	if (error) throw error;
	return data as AlbumPhotoRow;
}

/** 删除一张照片（只删数据库记录，存储桶里的文件保留） */
export async function deletePhoto(id: number): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase.from(PHOTOS_TABLE).delete().eq("id", id);
	if (error) throw error;
}

/** 修改照片的标题与描述 */
export async function updatePhoto(
	id: number,
	input: { title?: string; description?: string },
): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase
		.from(PHOTOS_TABLE)
		.update(input)
		.eq("id", id);
	if (error) throw error;
}
