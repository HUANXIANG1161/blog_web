/**
 * 留言板的 Supabase 客户端和数据访问层
 *
 * 为什么可以直接在前端调用：
 *   Supabase 的设计就是让前端直连的。anon key 是公开值，安全性靠
 *   数据库的行级安全策略（RLS）保证 —— 在 Supabase 后台给 guestbook_messages
 *   表开启 RLS 后，匿名角色只被授予「插入」和「读取」，没有任何删除或修改权限。
 *   注意：service_role key 绝对不能出现在前端或仓库里。
 *
 * 表结构、存储桶和权限策略的建法见 docs/GUESTBOOK.md。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { guestbookConfig } from "@/config";
import type { GuestbookMessage, GuestbookMessageInput } from "./types";

/** 数据库表名 */
const TABLE = "guestbook_messages";
/** 图片存储桶名 */
const BUCKET = "guestbook";

/** 从构建期环境变量读取 Supabase 配置（Vite 会静态替换 import.meta.env） */
function readEnv() {
	return {
		url: import.meta.env.PUBLIC_SUPABASE_URL as string | undefined,
		anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined,
	};
}

/** Supabase 是否已经配置好 */
export function isGuestbookConfigured(): boolean {
	const { url, anonKey } = readEnv();
	return Boolean(url && anonKey);
}

/**
 * 建立客户端。
 *
 * captchaToken 有值时，会作为请求头带给 Supabase，由它转发给 hCaptcha 校验；
 * 校验不通过时写入请求会被直接拒绝。之所以每次新建而不是复用单例：
 * token 是一次性的，复用到后续请求反而会失败。
 */
function createGuestbookClient(captchaToken?: string | null): SupabaseClient {
	const { url, anonKey } = readEnv();
	if (!url || !anonKey) {
		throw new Error(
			"Supabase 未配置：缺少 PUBLIC_SUPABASE_URL 或 PUBLIC_SUPABASE_ANON_KEY",
		);
	}

	return createClient(url, anonKey, {
		auth: {
			// 留言板不需要登录，关掉会话相关能力
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
		global: captchaToken
			? { headers: { "x-hcaptcha-token": captchaToken } }
			: undefined,
	});
}

/** 校验并上传图片，返回公开访问地址 */
export async function uploadGuestbookImage(file: File): Promise<string> {
	if (!guestbookConfig.imageAllowedTypes.includes(file.type)) {
		throw new Error("BAD_IMAGE_TYPE");
	}
	if (file.size > guestbookConfig.imageMaxBytes) {
		throw new Error("IMAGE_TOO_LARGE");
	}

	// 文件名用随机串：避免中文名、路径穿越和同名覆盖
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "png";
	const random = crypto.getRandomValues(new Uint8Array(8));
	const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
	const key = `${Date.now()}-${suffix}.${safeExt}`;

	const supabase = createGuestbookClient();
	const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
		contentType: file.type,
		// 文件名随机，不会被覆盖，可以放心长缓存
		cacheControl: "31536000",
		upsert: false,
	});
	if (error) throw error;

	return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

/** 读取留言列表，按时间倒序分页 */
export async function fetchMessages(
	offset = 0,
	limit = guestbookConfig.pageSize,
): Promise<GuestbookMessage[]> {
	const supabase = createGuestbookClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select("id,name,content,image_url,created_at")
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return (data ?? []) as GuestbookMessage[];
}

/** 提交一条留言，返回插入后的记录 */
export async function submitMessage(
	input: GuestbookMessageInput,
): Promise<GuestbookMessage> {
	const supabase = createGuestbookClient(input.captchaToken);
	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			name: input.name,
			content: input.content,
			image_url: input.image_url,
		})
		.select("id,name,content,image_url,created_at")
		.single();

	if (error) throw error;
	return data as GuestbookMessage;
}
