import type { Options } from '@sveltejs/vite-plugin-svelte';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import type { AstroIntegration, AstroRenderer } from 'astro';
/**
 * @deprecated Import `getContainerRenderer` from `@astrojs/svelte/container-renderer` instead.
 */
export declare function getContainerRenderer(): AstroRenderer;
export default function svelteIntegration(options?: Options): AstroIntegration;
export { vitePreprocess };
