import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { crawlFrameworkPkgs } from "vitefu";
import { getContainerRenderer as getContainerRendererImpl } from "./container-renderer.js";
function getContainerRenderer() {
  console.warn(
    "[@astrojs/svelte] Importing `getContainerRenderer` from `@astrojs/svelte` is deprecated. Import it from `@astrojs/svelte/container-renderer` instead."
  );
  return getContainerRendererImpl();
}
function svelteIntegration(options) {
  return {
    name: "@astrojs/svelte",
    hooks: {
      "astro:config:setup": async ({ config, updateConfig, addRenderer }) => {
        addRenderer(getContainerRendererImpl());
        const sveltePackages = await crawlFrameworkPkgs({
          root: fileURLToPath(config.root),
          isBuild: false,
          isFrameworkPkgByJson(pkgJson) {
            return !!pkgJson.peerDependencies?.svelte;
          }
        });
        updateConfig({
          vite: {
            plugins: [svelte(options), configEnvironmentPlugin(sveltePackages.ssr.noExternal)]
          }
        });
      }
    }
  };
}
function configEnvironmentPlugin(svelteNoExternal) {
  return {
    name: "@astrojs/svelte:config-environment",
    // Must run before vite-plugin-svelte's `setup-optimizer` so the
    // `optimizeDeps.exclude` below is visible to it.
    enforce: "pre",
    configEnvironment(environmentName) {
      if (environmentName === "client") return;
      return {
        resolve: { noExternal: svelteNoExternal },
        // `@sveltejs/vite-plugin-svelte` v7 force-includes Svelte's SSR
        // runtime (`svelte/server`, `svelte/internal/server`, ...) into
        // `optimizeDeps` for server environments. Because Astro's renderer
        // entrypoint (`@astrojs/svelte/server.js`) is resolved as a
        // `noExternal` dependency, it keeps using the raw transformed copy
        // of that runtime while the user's compiled components use the
        // pre-bundled copy — two instances of Svelte's server runtime with
        // separate `ssr_context` module state, which crashes dev SSR.
        // Excluding `svelte` makes vite-plugin-svelte skip the pre-bundle so
        // every consumer shares one transformed copy.
        //
        // See related logic in vite-plugin-svelte:
        // https://github.com/sveltejs/vite-plugin-svelte/blob/@sveltejs/vite-plugin-svelte@7.1.2/packages/vite-plugin-svelte/src/plugins/setup-optimizer.js#L51-L52
        optimizeDeps: { exclude: ["svelte"] }
      };
    }
  };
}
export {
  svelteIntegration as default,
  getContainerRenderer,
  vitePreprocess
};
