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
 * 全站共用一个客户端实例。
 *
 * 为什么必须共用：
 *   supabase-js 的登录态按项目 URL 存在同一个 localStorage key 下。如果
 *   同一页面里存在多个实例，它们会争抢同一个 key，控制台会报
 *   "Multiple GoTrueClient instances detected in the same browser context"，
 *   后果是登录态可能被另一个实例覆盖或清掉 —— 表现为「管理页有时认不出
 *   已登录」「列表偶尔加载不出来」这类偶发问题。
 *
 * 所以这里只建一次，并且统一开启登录态持久化。它带来的效果：
 *   - 匿名访客：没有会话，请求以 anon 身份发出，权限完全由 RLS 决定
 *   - 已登录站长：请求带上会话，能通过 authenticated 策略
 *   两种情况都是「请求带上当前身份」，不需要区分客户端。
 */
let sharedClient: SupabaseClient | null = null;

/**
 * 取得 Supabase 客户端。
 *
 * @param captchaToken 有值时作为请求头带上，供 Supabase 转发给 hCaptcha 校验。
 *   带 token 的调用会新建一次性实例 —— token 是一次性的，复用到后续请求
 *   反而会失败，而且它只影响那一次请求。
/**
 * 把 fetch 包一层超时。
 *
 * supabase-js 内部用 fetch 发请求，而浏览器默认没有超时 —— 连接被挂住
 * （网络不稳、被中间设备丢包）时 Promise 可能长时间不 settle，页面上的
 * 表现就是「一直在加载中」。这里用 AbortController 强制中断，
 * 让调用方至少能拿到一个错误并显示出来。
 */
function fetchWithTimeout(timeoutMs = 15000): typeof fetch {
	return async (input, init) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		try {
			return await fetch(input, { ...init, signal: controller.signal });
		} finally {
			clearTimeout(timer);
		}
	};
}

/**
 * @param persistSession 已忽略：登录态一律持久化。
 *   保留参数是为了不破坏现有调用点。
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

	// 所有实例都带上超时，避免网络挂住时界面永远停在加载态
	const globalOptions = { fetch: fetchWithTimeout() };

	// 带一次性验证码 token 的请求单独建实例，避免污染共享实例的请求头
	if (options?.captchaToken) {
		return createClient(url, anonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: false,
			},
			global: {
				...globalOptions,
				headers: { "x-hcaptcha-token": options.captchaToken },
			},
		});
	}

	if (!sharedClient) {
		sharedClient = createClient(url, anonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: false,
			},
			global: globalOptions,
		});
	}

	return sharedClient;
}

/**
 * 给 Supabase 查询加超时，并直接解出 { data, error }。
 *
 * 为什么需要：supabase-js 的查询是 thenable 而不是标准 Promise，网络被挂住时
 * 它可能既不 resolve 也不 reject。页面上的表现就是「一直在加载中」，永远转下去。
 * 加上超时后至少会 reject，界面就能显示错误提示。
 *
 * 用法上比逐个包 withTimeout 更省事 —— 调用点只改一个词：
 *
 *   const { data, error } = await runQuery(supabase.from(T).select("*"));
 *
 * @param timeoutMs 超时毫秒数。Supabase 在国内访问偏慢，默认给 15 秒。
 */
export async function runQuery<T>(
	query: PromiseLike<{ data: T; error: unknown }>,
	timeoutMs = 15000,
): Promise<{ data: T; error: unknown }> {
	return withTimeout(query, timeoutMs);
}

/**
 * 给任意 Supabase 调用加超时。
 *
 * @param timeoutMs 超时毫秒数。Supabase 在国内访问偏慢，默认给 15 秒。
 */
export function withTimeout<T>(
	query: PromiseLike<T>,
	timeoutMs = 15000,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error("REQUEST_TIMEOUT"));
		}, timeoutMs);

		query.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
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
