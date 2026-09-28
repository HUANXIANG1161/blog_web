import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const bannerSource = await readFile(
	new URL("../src/components/layout/Banner.astro", import.meta.url),
	"utf8",
);
const wallpaperSource = await readFile(
	new URL("../src/components/misc/FullscreenWallpaper.astro", import.meta.url),
	"utf8",
);
const wallpaperConfigSource = await readFile(
	new URL("../src/config/backgroundWallpaper.ts", import.meta.url),
	"utf8",
);
const siteConfigSource = await readFile(
	new URL("../src/config/siteConfig.ts", import.meta.url),
	"utf8",
);
const imageSource = await readFile(
	new URL("../src/components/atoms/Image/Image.astro", import.meta.url),
	"utf8",
);
const viewportImageSource = await readFile(
	new URL("../src/components/atoms/Image/ViewportImage.astro", import.meta.url),
	"utf8",
);
const imageSourceUtils = await readFile(
	new URL("../src/utils/image-source-utils.ts", import.meta.url),
	"utf8",
);

describe("Default image loading boundary", () => {
	it("uses media-qualified responsive sources for the first banner", () => {
		assert.match(bannerSource, /ViewportImage/);
		assert.match(bannerSource, /media="\(max-width: 767px\)"/);
		assert.match(bannerSource, /media="\(min-width: 768px\)"/);
		assert.match(bannerSource, /loading="lazy"[\s\S]*fetchpriority="low"/);
	});

	it("keeps inactive wallpaper requests low priority", () => {
		assert.match(wallpaperSource, /loading="lazy"/);
		assert.match(wallpaperSource, /fetchpriority="low"/);
		assert.doesNotMatch(wallpaperSource, /loading="eager"/);
		assert.doesNotMatch(wallpaperSource, /fetchpriority="high"/);
	});

	it("allows mirrored public assets to enter the Astro image pipeline", () => {
		assert.match(imageSource, /resolveImageMetadata/);
		assert.match(imageSource, /img && usePicture/);
		assert.match(
			imageSourceUtils,
			/if \(isRemoteImageSource\(src\)\) return src/,
		);
	});

	it("passes protocol-relative images through and emits the JPEG MIME type", () => {
		assert.match(imageSource, /const isRemote = isRemoteImageSource\(src\)/);
		assert.match(
			imageSource,
			/const isPublic = src\.startsWith\("\/"\) && !isRemote/,
		);
		assert.match(imageSource, /src={fullSrc}/);
		assert.doesNotMatch(imageSource, /url-utils/);
		assert.match(viewportImageSource, /format === "jpg" \? "jpeg" : format/);
		assert.match(
			viewportImageSource,
			/type={getImageMimeType\(source\.format\)}/,
		);
	});

	it("keeps existing default-image mirrors synchronized with public files", async () => {
		const activeConfigSource = `${siteConfigSource}\n${wallpaperConfigSource}`;
		for (const group of ["desktop-banner", "mobile-banner"]) {
			for (let index = 1; index <= 4; index += 1) {
				const relative = `assets/${group}/${index}.webp`;
				let publicFile;
				try {
					publicFile = await readFile(
						new URL(`../public/${relative}`, import.meta.url),
					);
				} catch (error) {
					if (error?.code !== "ENOENT") throw error;
					assert.doesNotMatch(activeConfigSource, new RegExp(relative));
					continue;
				}
				const mirroredFile = await readFile(
					new URL(`../src/assets/public/${relative}`, import.meta.url),
				);
				assert.deepEqual(
					mirroredFile,
					publicFile,
					`${relative} mirror drifted`,
				);
			}
		}
	});
});
