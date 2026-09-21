function getContainerRenderer() {
  return {
    name: "@astrojs/svelte",
    clientEntrypoint: "@astrojs/svelte/client.js",
    serverEntrypoint: "@astrojs/svelte/server.js"
  };
}
export {
  getContainerRenderer
};
