/**
 * Supabase 相册的访问密码
 *
 * 原理与项目自带的本地相册一致：
 *   构建时用 encryptContent() 把一段占位 HTML 用密码加密成密文写进页面，
 *   访客必须输对密码，PasswordProtection 才能在浏览器里用 WebCrypto 解开。
 *   明文密码永远不出现在构建产物里。
 *
 * ⚠️ 这个文件只允许在 .astro 的 frontmatter（构建时执行）里 import。
 *    里面有明文密码，一旦被客户端模块引用就会被打进 JS bundle 发给所有访客，
 *    所以故意不放进 src/config/index.ts 的 barrel 导出。
 *
 * ⚠️ PasswordProtection 把解锁状态记在 sessionStorage 的
 *    page-password-<pathname> 里，而详情页的 pathname 都是 /albums/view/
 *    （相册 id 在查询参数里），所以这里所有相册共用同一个密码。
 */

/** 需要密码才能看照片的相册 id */
export const protectedAlbumIds = [5, 6];

/** 受保护相册的访问密码 */
export const albumPassword = "121296";

/** 密码提示，留空则不显示 */
export const albumPasswordHint = "";

/** 构建时生成密文用的 slug。固定值 = 上述相册共用同一段密文 */
export const albumPasswordSlug = "albums:gate";
