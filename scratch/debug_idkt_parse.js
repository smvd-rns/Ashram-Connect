const https = require("https");

const BASE_URL = "https://audio.iskcondesiretree.com";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];

function normalizeFolderPath(path) {
  if (!path || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseIdktItemsFromHtml(html, currentPath) {
  const normalizedPath = normalizeFolderPath(currentPath);
  const itemsByPath = new Map();
  const linkRegex =
    /<a\s+[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'"\s>]+))[^>]*?>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const hrefRaw = decodeHtmlEntities((match[1] || match[2] || match[3] || "").trim());
    const labelRaw = (match[4] || "").replace(/<[^>]*>/g, "").trim();
    if (!hrefRaw) continue;

    let parsedUrl;
    try {
      parsedUrl = new URL(hrefRaw, `${BASE_URL}/`);
    } catch {
      continue;
    }

    if (
      parsedUrl.pathname.includes("/images/") ||
      parsedUrl.pathname.includes("/style/") ||
      parsedUrl.pathname.includes("/skins/") ||
      hrefRaw.startsWith("mailto:") ||
      hrefRaw.startsWith("javascript:") ||
      hrefRaw.includes("q=s")
    ) {
      continue;
    }

    const q = parsedUrl.searchParams.get("q");
    const fParam = parsedUrl.searchParams.get("f");

    if (q === "f" && fParam) {
      const folderPath = normalizeFolderPath(decodeURIComponent(fParam));
      if (folderPath === normalizedPath) continue;
      if (!folderPath.startsWith(normalizedPath)) continue;

      const parentPath = normalizeFolderPath(folderPath.split("/").slice(0, -2).join("/") || "/");
      if (parentPath !== normalizedPath) continue;

      const fallbackName = folderPath.split("/").filter(Boolean).pop() || "Unknown Folder";
      const name = (labelRaw || decodeURIComponent(fallbackName)).replace(/_/g, " ");
      itemsByPath.set(folderPath, {
        name,
        type: "folder",
        full_path: folderPath
      });
      continue;
    }

    const pathnameLower = parsedUrl.pathname.toLowerCase();
    const isAudioByPath = AUDIO_EXTENSIONS.some((ext) => pathnameLower.endsWith(ext));
    const fAudioPath = fParam ? decodeURIComponent(fParam) : "";
    const isAudioByParam = AUDIO_EXTENSIONS.some((ext) => fAudioPath.toLowerCase().endsWith(ext));
    if (!isAudioByPath && !isAudioByParam) continue;

    const audioPathRaw = isAudioByParam ? fAudioPath : decodeURIComponent(parsedUrl.pathname);
    const normalizedAudioPath = audioPathRaw.startsWith("/") ? audioPathRaw : `/${audioPathRaw}`;
    if (!normalizedAudioPath.startsWith(normalizedPath)) continue;

    const lastSlash = normalizedAudioPath.lastIndexOf("/");
    const parentPath = normalizeFolderPath(normalizedAudioPath.slice(0, lastSlash + 1));
    if (parentPath !== normalizedPath) continue;

    const filename = normalizedAudioPath.split("/").filter(Boolean).pop() || "Unknown Audio";
    itemsByPath.set(normalizedAudioPath, {
      name: labelRaw || filename,
      type: "audio",
      full_path: normalizedAudioPath
    });
  }

  return Array.from(itemsByPath.values());
}

const path = "/02_-_ISKCON_Swamis/ISKCON_Swamis_-_R_to_Y/His_Holiness_Radha_Govinda_Swami/";
const canonicalPath = path.endsWith("/") ? path.slice(0, -1) : path;
const url = `${BASE_URL}/index.php?q=f&f=${encodeURIComponent(canonicalPath)}`;

https.get(url, (res) => {
  let html = "";
  res.on("data", (chunk) => {
    html += chunk;
  });
  res.on("end", () => {
    const hrefAttrSamples = html.match(/href\s*=\s*[^ >]+/gi) || [];
    console.log("href attr sample:", hrefAttrSamples.slice(0, 20));
    const anchorSamples = html.match(/<a[\s\S]*?<\/a>/gi) || [];
    console.log("anchor sample count:", anchorSamples.length);
    console.log("anchor samples:", anchorSamples.slice(0, 5));
    const items = parseIdktItemsFromHtml(html, path);
    console.log("status:", res.statusCode);
    console.log("parsed items:", items.length);
    console.log("folders:", items.filter((i) => i.type === "folder").length);
    console.log("audio:", items.filter((i) => i.type === "audio").length);
    console.log("sample:", items.slice(0, 15).map((i) => i.full_path));
  });
});
