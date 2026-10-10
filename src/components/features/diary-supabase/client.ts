/**
 * 日记的数据访问层
 *
 * 权限模型：匿名只读，写入需要登录。
 *   公开的日记页 —— 用匿名身份读取
 *   管理页       —— 邮箱密码登录后写入，登录态存在 localStorage
 *
 * 两条路径用的是同一个 anon key，能做什么完全由数据库的行级安全策略决定：
 * diary_entries 只给 anon 角色 select，insert/update/delete 只给 authenticated。
 * 建表 SQL 与配置步骤见 docs/DIARY.md。
 */
import { diarySupabaseConfig } from "@/config";
import {
	createSupabaseClient,
	isSupabaseConfigured,
	uploadImage,
} from "@/utils/supabase-client";
import type { DiaryEntry, DiaryEntryInput } from "./types";

/** 数据库表名 */
const TABLE = "diary_entries";
/** 图片存储桶名 */
const BUCKET = "diary";

/** Supabase 是否已经配置好 */
export const isDiarySupabaseConfigured = isSupabaseConfigured;

/** 上传一张日记配图，返回公开访问地址。上传需要登录态 */
export function uploadDiaryImage(file: File): Promise<string> {
	return uploadImage(BUCKET, file, {
		allowedTypes: diarySupabaseConfig.imageAllowedTypes,
		maxBytes: diarySupabaseConfig.imageMaxBytes,
		prefix: "diary",
		requireAuth: true,
	});
}

// ─── 公开页面用：匿名读取 ──────────────────────────────────────

/** 读取日记列表，按时间倒序分页 */
export async function fetchDiaryEntries(
	offset = 0,
	limit = diarySupabaseConfig.pageSize,
): Promise<DiaryEntry[]> {
	const supabase = createSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select("id,content,images,tags,created_at")
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return normalizeEntries(data);
}

// ─── 管理页用：需要登录 ────────────────────────────────────────

/** 建立一个会持久化登录态的客户端（管理页专用） */
function adminClient() {
	return createSupabaseClient({ persistSession: true });
}

/** 当前登录用户，未登录返回 null */
export async function getCurrentUser() {
	const { data, error } = await adminClient().auth.getUser();
	if (error) return null;
	return data.user ?? null;
}

/**
 * 邮箱密码登录。
 *
 * @param captchaToken Supabase 开启了 Attack Protection 时必填。
 *   本站用的是 Cloudflare Turnstile：客户端拿到 token 后由 supabase-js
 *   放进请求体交给 Supabase 校验，校验不过服务端直接拒绝（captcha_failed）。
 *   token 是一次性的，登录失败后要重新获取。
 */
export async function signIn(
	email: string,
	password: string,
	captchaToken?: string | null,
): Promise<void> {
	const { error } = await adminClient().auth.signInWithPassword({
		email,
		password,
		options: captchaToken ? { captchaToken } : undefined,
	});
	if (error) throw error;
}

/** 退出登录 */
export async function signOut(): Promise<void> {
	await adminClient().auth.signOut();
}

/** 读取全部日记（管理页要看到所有内容），按时间倒序 */
export async function fetchAllEntries(): Promise<DiaryEntry[]> {
	const supabase = adminClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select("id,content,images,tags,created_at")
		.order("created_at", { ascending: false });

	if (error) throw error;
	return normalizeEntries(data);
}

/** 新建一条日记 */
export async function createEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
	const supabase = adminClient();
	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			content: input.content,
			images: input.images,
			tags: input.tags,
		})
		.select("id,content,images,tags,created_at")
		.single();

	if (error) throw error;
	return normalizeEntry(data);
}

/** 修改一条日记 */
export async function updateEntry(
	id: number,
	input: DiaryEntryInput,
): Promise<DiaryEntry> {
	const supabase = adminClient();
	const { data, error } = await supabase
		.from(TABLE)
		.update({
			content: input.content,
			images: input.images,
			tags: input.tags,
			// 改动后刷新时间，让它在列表里回到最前
			created_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("id,content,images,tags,created_at")
		.single();

	if (error) throw error;
	return normalizeEntry(data);
}

/** 删除一条日记 */
export async function deleteEntry(id: number): Promise<void> {
	const supabase = adminClient();
	const { error } = await supabase.from(TABLE).delete().eq("id", id);
	if (error) throw error;
}

// ─── 数据整形 ─────────────────────────────────────────────────

/**
 * 数据库返回的 images / tags 理论上就是数组，但从 PostgREST 拿到的
 * 可能是 null，这里统一成空数组，避免下游到处判空。
 */
function normalizeEntry(row: unknown): DiaryEntry {
	const r = (row ?? {}) as Partial<DiaryEntry>;
	return {
		id: Number(r.id),
		content: String(r.content ?? ""),
		images: Array.isArray(r.images) ? r.images : [],
		tags: Array.isArray(r.tags) ? r.tags : [],
		created_at: String(r.created_at ?? ""),
	};
}

function normalizeEntries(rows: unknown): DiaryEntry[] {
	if (!Array.isArray(rows)) return [];
	return rows.map(normalizeEntry);
}
