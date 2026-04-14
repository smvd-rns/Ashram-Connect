const fs = require("fs");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const BASE_URL = "https://audio.iskcondesiretree.com";
const TARGET_PATH = "/02_-_ISKCON_Swamis/ISKCON_Swamis_-_R_to_Y/His_Holiness_Radha_Govinda_Swami/";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];

function loadEnv() {
  const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function normalizeFolderPath(path) {
  if (!path || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function buildFolderBrowseUrl(path) {
  if (path === "/") return `${BASE_URL}/index.php`;
  const canonical = path.endsWith("/") ? path.slice(0, -1) : path;
  return `${BASE_URL}/index.php?q=f&f=${encodeURIComponent(canonical)}`;
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isCountLabel(label) {
  return /^\d+\s*(file|files|folder|folders)$/i.test(label.trim());
}

function mergePreferredName(existingName, candidateName, fallbackName) {
  const existing = decodeHtmlEntities(existingName || "").trim();
  const candidate = decodeHtmlEntities(candidateName || "").trim();
  const fallback = decodeHtmlEntities(fallbackName || "").trim();

  if (!existing) return candidate || fallback;
  if (!candidate) return existing;

  const existingCount = isCountLabel(existing);
  const candidateCount = isCountLabel(candidate);

  if (existingCount && !candidateCount) return candidate;
  if (!existingCount && candidateCount) return existing;
  if (existing.length >= candidate.length) return existing;
  return candidate;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            resolve(body);
          });
        }
      )
      .on("error", reject);
  });
}

function parseIdktItemsFromHtml(html, currentPath) {
  const normalizedPath = normalizeFolderPath(currentPath);
  const itemsByPath = new Map();
  const linkRegex =
    /<a\s+[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'"\s>]+))[^>]*?>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const hrefRaw = decodeHtmlEntities((match[1] || match[2] || match[3] || "").trim());
    const labelRaw = decodeHtmlEntities((match[4] || "").replace(/<[^>]*>/g, "").trim());
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
      const fallbackDisplayName = decodeURIComponent(fallbackName).replace(/_/g, " ");
      const previous = itemsByPath.get(folderPath);
      const name = mergePreferredName(previous?.name || "", labelRaw, fallbackDisplayName).replace(/_/g, " ");
      itemsByPath.set(folderPath, {
        ...(previous || {}),
        name,
        type: "folder",
        url: "",
        parent_path: normalizedPath,
        full_path: folderPath,
        is_scanned: false,
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
    const cleanName = decodeURIComponent(filename).replace(/\.[^.]+$/, "").replace(/_/g, " ");
    const previous = itemsByPath.get(normalizedAudioPath);
    const name = mergePreferredName(previous?.name || "", labelRaw, cleanName);
    itemsByPath.set(normalizedAudioPath, {
      ...(previous || {}),
      name,
      type: "audio",
      url: `${BASE_URL}${normalizedAudioPath}`,
      parent_path: normalizedPath,
      full_path: normalizedAudioPath,
      is_scanned: false,
    });
  }

  return Array.from(itemsByPath.values());
}

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const html = await fetchText(buildFolderBrowseUrl(TARGET_PATH));
  const items = parseIdktItemsFromHtml(html, TARGET_PATH);
  console.log("discovered", items.length, "items");

  const { error: upsertError } = await supabase.from("idkt_items").upsert(items, { onConflict: "full_path" });
  if (upsertError) throw upsertError;

  const { error: markError } = await supabase
    .from("idkt_items")
    .update({ is_scanned: true })
    .eq("full_path", TARGET_PATH);
  if (markError) throw markError;

  const { count } = await supabase
    .from("idkt_items")
    .select("*", { count: "exact", head: true })
    .eq("parent_path", TARGET_PATH);
  console.log("children now in DB:", count);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
