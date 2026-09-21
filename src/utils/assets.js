// Public assets must respect Vite's base path for GitHub project Pages.
export const assetUrl = (filename) => `${import.meta.env.BASE_URL}assets/${filename}`;

export const normalizeAssetUrl = (url) =>
  typeof url === "string" && url.startsWith("/assets/")
    ? assetUrl(url.slice("/assets/".length))
    : url;
