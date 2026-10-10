/**
 * 浏览器端生成缩略图
 *
 * 手机直出的照片通常 5~10MB，相册列表如果直接加载原图会非常卡。
 * 这里在上传前用 canvas 压一张小图一并传上去，列表用缩略图、点开看原图。
 *
 * 只做等比缩放，不裁剪 —— 相册要保持原始构图（瀑布流布局依赖真实宽高比）。
 */

export interface ThumbnailResult {
	blob: Blob;
	width: number;
	height: number;
}

/**
 * 把图片缩到指定宽度以内，返回压缩后的 JPEG。
 * 原图本身就比目标宽度小、且是 JPEG 时直接返回原文件，避免无意义的重新编码。
 */
export async function createThumbnail(
	file: File,
	targetWidth: number,
	quality: number,
): Promise<ThumbnailResult> {
	const bitmap = await loadBitmap(file);

	const scale = Math.min(1, targetWidth / bitmap.width);
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	// 已经足够小就不重新编码了（重新编码只会损失画质）
	if (scale === 1 && file.type === "image/jpeg") {
		release(bitmap);
		return { blob: file, width, height };
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		release(bitmap);
		throw new Error("CANVAS_UNAVAILABLE");
	}

	// 缩放时开启平滑，避免锯齿
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(bitmap, 0, 0, width, height);

	release(bitmap);

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", quality),
	);
	if (!blob) throw new Error("THUMBNAIL_FAILED");

	return { blob, width, height };
}

/** ImageBitmap 优先（解码更快），不支持时退回 <img> */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
	if (typeof createImageBitmap === "function") {
		try {
			return await createImageBitmap(file);
		} catch {
			// 某些格式（如部分 SVG）createImageBitmap 会失败，走下面的兜底
		}
	}

	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.decoding = "async";
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
			img.src = url;
		});
		return img;
	} finally {
		// 图片已经解码进内存，可以释放了
		URL.revokeObjectURL(url);
	}
}

function release(bitmap: ImageBitmap | HTMLImageElement): void {
	if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) {
		bitmap.close();
	}
}
