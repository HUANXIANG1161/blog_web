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
	runQuery,
	uploadImage,
} from "@/utils/supabase-client";
import type {
	AlbumGroupRow,
	AlbumPhotoRow,
	AlbumRowWithPhotos,
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
//
// 所有查询都走 runQuery（内部是 withTimeout）：supabase-js 的查询是 thenable，网络被挂住时
// 可能永不 settle，页面上就表现为「一直在加载中」。

/** 读取相册列表，按日期倒序（没有 date 的用创建时间） */
export async function fetchAlbums(
	offset = 0,
	limit = albumsSupabaseConfig.pageSize,
): Promise<AlbumGroupRow[]> {
	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase
			.from(GROUPS_TABLE)
			.select(GROUP_COLUMNS)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1),
	);

	if (error) throw error;
	return (data ?? []) as AlbumGroupRow[];
}

/** 读取单个相册，不存在时返回 null */
export async function fetchAlbumById(
	id: number,
): Promise<AlbumGroupRow | null> {
	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase.from(GROUPS_TABLE).select(GROUP_COLUMNS).eq("id", id).maybeSingle(),
	);

	if (error) throw error;
	return (data as AlbumGroupRow | null) ?? null;
}

/** 读取某个相册下的全部照片，按上传时间正序 */
export async function fetchAlbumPhotos(
	albumId: number,
): Promise<AlbumPhotoRow[]> {
	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase
			.from(PHOTOS_TABLE)
			.select(PHOTO_COLUMNS)
			.eq("album_id", albumId)
			.order("created_at", { ascending: true }),
	);

	if (error) throw error;
	return (data ?? []) as AlbumPhotoRow[];
}

/**
 * 相册列表的内存缓存。
 *
 * 为什么需要：站点用 Swup 做无刷新跳转，返回相册页时会重新执行页面脚本。
 * 每次都重新查两遍数据库的话，返回时先显示缓存快照（客户端渲染的卡片不在里面），
 * 等请求回来才重新填上 —— 中间那一瞬看起来就是「相册消失了」，同时也慢。
 *
 * 缓存只在当前页面会话内有效（存在模块作用域，刷新即清空），
 * TTL 用来避免长时间停留后看到过期数据。管理页会用 force 绕过它。
 */
const CACHE_TTL_MS = 30_000;
let albumsCache: { at: number; data: AlbumWithPhotos[] } | null = null;

/** 清掉缓存。改动相册/照片后调用，避免列表显示旧数据。 */
export function invalidateAlbumsCache(): void {
	albumsCache = null;
}

/** 列表页用的嵌套 select：相册字段 + 内嵌的照片 */
const GROUP_WITH_PHOTOS_SELECT = `${GROUP_COLUMNS},${PHOTOS_TABLE}(${PHOTO_COLUMNS})`;

/**
 * 一次性读取相册列表页需要的数据：每个相册 + 它的照片。
 *
 * 用 PostgREST 的嵌套 select 一次查完。实测到 Supabase 单次请求约 1.2 秒，
 * 拆成两次串行就是 2.5 秒 —— 合并成一次能省掉整整一趟往返。
 *
 * @param force 为 true 时跳过缓存（管理页要用最新数据）
 */
export async function fetchAlbumsWithPhotos(
	force = false,
): Promise<AlbumWithPhotos[]> {
	if (!force && albumsCache && Date.now() - albumsCache.at < CACHE_TTL_MS) {
		return albumsCache.data;
	}

	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase
			.from(GROUPS_TABLE)
			.select(GROUP_WITH_PHOTOS_SELECT)
			.order("created_at", { ascending: false }),
	);

	if (error) throw error;

	const result = ((data ?? []) as unknown as AlbumRowWithPhotos[]).map(
		(row) => {
			// 内嵌字段叫 album_photos，这里拆成 { album, photos } 的形状
			const { album_photos, ...album } = row;
			return {
				album: album as AlbumGroupRow,
				photos: (album_photos ?? []).slice().sort(
					(a, b) =>
						new Date(a.created_at).getTime() -
						new Date(b.created_at).getTime(),
				),
			};
		},
	);

	albumsCache = { at: Date.now(), data: result };
	return result;
}

// ─── 管理页用：需要登录 ────────────────────────────────────────

/** 新建相册，返回新记录。cover 允许为空，传第一张照片后再更新 */
export async function createAlbum(input: {
	title: string;
	description: string;
	location: string;
	date: string | null;
}): Promise<AlbumGroupRow> {
	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase
			.from(GROUPS_TABLE)
			.insert({
				title: input.title,
				description: input.description,
				location: input.location,
				date: input.date,
			})
			.select(GROUP_COLUMNS)
			.single(),
	);

	if (error) throw error;
	invalidateAlbumsCache();
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
	const supabase = createSupabaseClient();
	const { error } = await runQuery(
		supabase.from(GROUPS_TABLE).update(input).eq("id", id),
	);
	if (error) throw error;
	invalidateAlbumsCache();
}

/**
 * 删除相册。
 * 照片行靠外键的 on delete cascade 一起删掉，
 * 但存储桶里的图片文件不会自动删（需要另外处理，见 docs/ALBUMS.md）。
 */
export async function deleteAlbum(id: number): Promise<void> {
	const supabase = createSupabaseClient();
	const { error } = await runQuery(
		supabase.from(GROUPS_TABLE).delete().eq("id", id),
	);
	if (error) throw error;
	invalidateAlbumsCache();
}

/** 往相册里加一张照片 */
export async function createPhoto(
	input: PhotoUploadInput,
): Promise<AlbumPhotoRow> {
	const supabase = createSupabaseClient();
	const { data, error } = await runQuery(
		supabase
			.from(PHOTOS_TABLE)
			.insert({
				album_id: input.albumId,
				src: input.src,
				thumbnail: input.thumbnail,
				title: input.title,
				description: input.description,
			})
			.select(PHOTO_COLUMNS)
			.single(),
	);

	if (error) throw error;
	invalidateAlbumsCache();
	return data as AlbumPhotoRow;
}

/** 删除一张照片（只删数据库记录，存储桶里的文件保留） */
export async function deletePhoto(id: number): Promise<void> {
	const supabase = createSupabaseClient();
	const { error } = await runQuery(
		supabase.from(PHOTOS_TABLE).delete().eq("id", id),
	);
	if (error) throw error;
	invalidateAlbumsCache();
}

/** 修改照片的标题与描述 */
export async function updatePhoto(
	id: number,
	input: { title?: string; description?: string },
): Promise<void> {
	const supabase = createSupabaseClient();
	const { error } = await runQuery(
		supabase.from(PHOTOS_TABLE).update(input).eq("id", id),
	);
	if (error) throw error;
	invalidateAlbumsCache();
}
