/**
 * Admin sign-in helpers shared by the diary and albums admin pages.
 *
 * Both pages need "check session / sign in / sign out", so it lives here
 * instead of being written twice.
 *
 * Note: signing in only establishes an `authenticated` identity. What that
 * identity may actually do is decided entirely by the database row level
 * security policies -- there is no permission logic in the frontend, and
 * there should not be any.
 */
import {
	createSupabaseClient,
	isSupabaseConfigured,
} from "@/utils/supabase-client";

/** Whether Supabase is configured at all */
export const isAdminConfigured = isSupabaseConfigured;

/** Client for admin pages: needs the session persisted across reloads */
function client() {
	return createSupabaseClient({ persistSession: true });
}

/**
 * Sign in with email and password.
 *
 * @param captchaToken Required when Supabase Attack Protection is enabled;
 *   obtained from Cloudflare Turnstile on the client. Tokens are single-use.
 */
export async function adminSignIn(
	email: string,
	password: string,
	captchaToken?: string | null,
): Promise<void> {
	const { error } = await client().auth.signInWithPassword({
		email,
		password,
		options: captchaToken ? { captchaToken } : undefined,
	});
	if (error) throw error;
}

/** Sign out */
export async function adminSignOut(): Promise<void> {
	await client().auth.signOut();
}

/** Currently signed-in user, or null */
export async function adminGetUser() {
	const { data, error } = await client().auth.getUser();
	if (error) return null;
	return data.user ?? null;
}

/** Detect Supabase captcha failures so the UI can show a specific message */
export function isCaptchaError(error: unknown): boolean {
	const code = (error as { code?: string } | null)?.code;
	const message = error instanceof Error ? error.message : String(error);
	return code === "captcha_failed" || /captcha/i.test(message);
}