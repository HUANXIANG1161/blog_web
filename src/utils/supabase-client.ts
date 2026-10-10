/**
 * Supabase 客户端的公共部分
 *
 * 留言板和日记都用同一套配置（同一个 Supabase 项目），区别在于表名、
 * 存储桶和权限策略，那些由各自的模块负责。
 *
 * 关于安全性：anon key 是公开值，会编进前端产物，这是 Supabase 的设计。
 * 真正拦住越权操作的是数据库的行级安全策略（RLS）—— 留言板允许匿名写，
 * 日记只允许登录用户写，都是靠策略区分，不是靠隐藏这个 key。
 * service_role key 绝对不能出现在这里。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv() {
	return {
		url: import.meta.env.PUBLIC_SUPABASE_URL as string | undefined,
		anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined,
	};
}

/** Supabase 是否已经配置好 */
export function isSupabaseConfigured(): boolean {
	const { url, anonKey } = readEnv();
	return Boolean(url && anonKey);
}

/**
 * 持久化登录态的客户端必须复用同一个实例。
 *
 * 原因：createClient() 每次调用都返回全新实例，而新实例是「匿名」的 ——
 * 它的会话要从 localStorage 异步恢复。如果上传图片时新建一个实例，
 * 请求会在会话恢复完成前发出，于是带着 anon key 去打需要 authenticated
 * 的策略，报 "new row violates row-level security policy"。
 *
 * 留言板（persistSession: false）不需要共用，因为它本来就以匿名身份读写。
 */
let persistentClient: SupabaseClient | null = null;

/**
 * 建立客户端。
 *
 * @param captchaToken 有值时作为请求头带上，供 Supabase 转发给 hCaptcha 校验。
 *   带了 token 的调用一律新建实例，因为 token 是一次性的，
 *   复用到后续请求反而会失败。
 * @param persistSession 是否复用带登录态的共享实例（管理页用 true）
 */
export function createSupabaseClient(options?: {
	captchaToken?: string | null;
	persistSession?: boolean;
}): SupabaseClient {
	const { url, anonKey } = readEnv();
	if (!url || !anonKey) {
		throw new Error(
			"Supabase 未配置：缺少 PUBLIC_SUPABASE_URL 或 PUBLIC_SUPABASE_ANON_KEY",
		);
	}

	const persistSession = options?.persistSession ?? false;

	// 需要登录态、且没有一次性 token 时，复用共享实例
	if (persistSession && !options?.captchaToken) {
		if (!persistentClient) {
			persistentClient = createClient(url, anonKey, {
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: false,
				},
			});
		}
		return persistentClient;
	}

	return createClient(url, anonKey, {
		auth: {
			persistSession,
			autoRefreshToken: persistSession,
			detectSessionInUrl: false,
		},
		global: options?.captchaToken
			? { headers: { "x-hcaptcha-token": options.captchaToken } }
			: undefined,
	});
}

/**
 * 校验并上传一张图片，返回公开访问地址。
 *
 * 注意这里刻意不带 hCaptcha token：图片上传走 storage 的权限策略，
 * 而 token 是一次性的，用在无关请求上反而会让后续真正的写库请求失败。
 *
 * @param bucket 存储桶名
 * @param file 待上传文件
 * @param options.prefix 文件名前缀，便于在后台区分来源
 * @param options.requireAuth 需要登录态时传 true。
 *   此时会复用共享的已登录客户端，并等会话恢复完成再上传 ——
 *   否则请求可能以匿名身份发出，被「只允许 authenticated」的策略拒绝。
 */
export async function uploadImage(
	bucket: string,
	file: File,
	options: {
		allowedTypes: string[];
		maxBytes: number;
		prefix: string;
		requireAuth?: boolean;
	},
): Promise<string> {
	if (!options.allowedTypes.includes(file.type)) {
		throw new Error("BAD_IMAGE_TYPE");
	}
	if (file.size > options.maxBytes) {
		throw new Error("IMAGE_TOO_LARGE");
	}

	// 文件名用随机串：避免中文名、路径穿越和同名覆盖
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "png";
	const random = crypto.getRandomValues(new Uint8Array(8));
	const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
	const key = `${options.prefix}-${Date.now()}-${suffix}.${safeExt}`;

	const supabase = createSupabaseClient({
		persistSession: options.requireAuth ?? false,
	});

	// 新实例的会话是异步从 localStorage 恢复的。
	// 这里显式等一次，确保上传请求带上的是已登录身份而不是 anon key。
	if (options.requireAuth) {
		const { data } = await supabase.auth.getSession();
		if (!data.session) {
			throw new Error("NOT_SIGNED_IN");
		}
	}

	const { error } = await supabase.storage.from(bucket).upload(key, file, {
		contentType: file.type,
		// 文件名随机，不会被覆盖，可以放心长缓存
		cacheControl: "31536000",
		upsert: false,
	});
	if (error) throw error;

	return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}
