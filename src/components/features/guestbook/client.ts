/**
 * 留言板的数据访问层
 *
 * 权限模型：匿名可读可写。安全性靠两点：
 *   1. 数据库行级安全策略只给 anon 角色 select 和 insert，
 *      没有 update / delete，所以访客改不了也删不掉别人的留言
 *   2. 应用层的蜜罐字段 + 可选的 hCaptcha 人机验证防刷
 *
 * 建表 SQL 与配置步骤见 docs/GUESTBOOK.md。
 */
import { guestbookConfig } from "@/config";
import {
	createSupabaseClient,
	isSupabaseConfigured,
	uploadImage,
} from "@/utils/supabase-client";
import type { GuestbookMessage, GuestbookMessageInput } from "./types";

/** 数据库表名 */
const TABLE = "guestbook_messages";
/** 图片存储桶名 */
const BUCKET = "guestbook";

/** Supabase 是否已经配置好 */
export const isGuestbookConfigured = isSupabaseConfigured;

/** 校验并上传图片，返回公开访问地址 */
export function uploadGuestbookImage(file: File): Promise<string> {
	return uploadImage(BUCKET, file, {
		allowedTypes: guestbookConfig.imageAllowedTypes,
		maxBytes: guestbookConfig.imageMaxBytes,
		prefix: "gb",
	});
}

/** 读取留言列表，按时间倒序分页 */
export async function fetchMessages(
	offset = 0,
	limit = guestbookConfig.pageSize,
): Promise<GuestbookMessage[]> {
	const supabase = createSupabaseClient();
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
	const supabase = createSupabaseClient({
		captchaToken: input.captchaToken,
	});
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
