import type { Song } from "./types";

export const STORAGE_KEY_VOLUME = "music-player-volume";

export const DEFAULT_VOLUME = 0.7;

export const DEFAULT_COVER_URL = "/favicon/favicon.ico";

// 本地播放列表。主题自带的示例曲目已删除（曲目属于原主题作者，也不该随站点分发）。
//
// 想启用本地音乐：
//   1. 把音频和封面放到 public/assets/music/ 下
//   2. 照下面的结构往 playlist 里补条目；cover 留空会用 DEFAULT_COVER_URL 兜底
//   3. 把 src/config/musicConfig.ts 的 enable 改成 true
//
// url / cover 以 "/" 开头时按 public/ 解析，否则按站点根路径补齐。
const playlist: Song[] = [];

export const LOCAL_PLAYLIST: Song[] = playlist;

export const DEFAULT_SONG: Song = {
	title: "Sample Song",
	artist: "Sample Artist",
	cover: DEFAULT_COVER_URL,
	url: "",
	duration: 0,
	id: 0,
};

// Meting 模式默认值。没有配置自建 API 时留空，store 会跳过请求而不是打第三方演示接口。
export const DEFAULT_METING_API = "";
export const DEFAULT_METING_ID = "";
export const DEFAULT_METING_SERVER = "netease";
export const DEFAULT_METING_TYPE = "playlist";

export const ERROR_DISPLAY_DURATION = 3000;
export const SKIP_ERROR_DELAY = 1000;
