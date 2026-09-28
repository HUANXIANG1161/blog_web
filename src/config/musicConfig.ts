import type { MusicPlayerConfig } from "../types/config";

// 音乐播放器配置
// 默认关闭。本地播放列表在 src/components/widgets/music-player/constants.ts，
// 主题自带的示例曲目已删除，需要自己往 public/assets/music/ 放音频。
export const musicPlayerConfig: MusicPlayerConfig = {
	enable: false, // 启用音乐播放器功能
	showFloatingPlayer: true, // 显示悬浮播放器 UI
	floatingEntryMode: "fab", // 悬浮入口模式："default" 为独立悬浮播放器，"fab" 为集成到通用 FAB 组
	mode: "local", // 音乐播放器模式，可选 "local" 或 "meting"

	// 以下仅 meting 模式需要。用自建 Meting API 时填上，缺少配置时不会去请求第三方演示接口。
	// meting_api: "https://your-meting.example.com/api?server=:server&type=:type&id=:id&auth=:auth&r=:r",
	// id: "你的歌单ID",
	server: "netease", // 音乐源服务器。有的meting的api源支持更多平台,一般来说,netease=网易云音乐, tencent=QQ音乐, kugou=酷狗音乐, xiami=虾米音乐, baidu=百度音乐
	type: "playlist", // 播单类型
};
