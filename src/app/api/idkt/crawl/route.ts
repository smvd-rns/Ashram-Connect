import { NextRequest, NextResponse } from "next/server";
import { supabaseIdktAdmin } from "@/lib/supabaseIdkt";

const BASE_URL = "https://audio.iskcondesiretree.com";
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];
type IdktItem = {
  name: string;
  type: "folder" | "audio";
  url: string;
  parent_path: string;
  full_path: string;
  is_scanned: boolean;
  error_count?: number;
  last_error?: string | null;
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function normalizeFolderPath(path: string) {
  if (!path || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function buildFolderBrowseUrl(path: string) {
  if (path === "/") return `${BASE_URL}/index.php`;
  const canonical = path.endsWith("/") ? path.slice(0, -1) : path;
  return `${BASE_URL}/index.php?q=f&f=${encodeURIComponent(canonical)}`;
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isCountLabel(label: string) {
  return /^\d+\s*(file|files|folder|folders)$/i.test(label.trim());
}

function mergePreferredName(existingName: string, candidateName: string, fallbackName: string) {
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

function parseIdktItemsFromHtml(html: string, currentPath: string) {
  const normalizedPath = normalizeFolderPath(currentPath);
  const itemsByPath = new Map<string, IdktItem>();
  const linkRegex =
    /<a\s+[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'"\s>]+))[^>]*?>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const hrefRaw = decodeHtmlEntities((match[1] || match[2] || match[3] || "").trim());
    const labelRaw = decodeHtmlEntities((match[4] || "").replace(/<[^>]*>/g, "").trim());
    if (!hrefRaw) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(hrefRaw, `${BASE_URL}/`);
    } catch {
      continue;
    }

    // Ignore known non-content links.
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

    // Folder links always come as index.php?q=f&f=<folder path>
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
        is_scanned: false
      });
      continue;
    }

    // Audio links are usually direct absolute links to *.mp3 files.
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
      is_scanned: false
    });
  }

  return Array.from(itemsByPath.values());
}

/**
 * IDKT CRAWLER API
 * Recursively (batch-style) syncs the folder structure and audio links from IDKT.
 */

export async function POST(req: NextRequest) {
  if (!supabaseIdktAdmin) {
    return NextResponse.json({ error: "Supabase service role key missing" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, path = "/" } = body;
    const normalizedPath = normalizeFolderPath(path);

    if (action === "sync_folder") {
      let items: IdktItem[] = [];
      
      if (normalizedPath === "/") {
        // The root domain audio.iskcondesiretree.com serves a custom Wimpy Player / PHP wrapper,
        // which prevents HTML regex crawling. We statically define its six known top-level Apache directories:
        const rootFolders = [
          { name: "Srila Prabhupada", href: "01_-_Srila_Prabhupada/" },
          { name: "ISKCON Swamis", href: "02_-_ISKCON_Swamis/" },
          { name: "ISKCON Prabhujis", href: "03_-_ISKCON_Prabhujis/" },
          { name: "ISKCON Matajis", href: "04_-_ISKCON_Matajis/" },
          { name: "ISKCON Chowpatty", href: "05_-_ISKCON_Chowpatty/" },
          { name: "More", href: "06_-_More/" }
        ];

        items = rootFolders.map(f => ({
          name: f.name,
          type: "folder",
          url: "",
          parent_path: "/",
          full_path: `/${f.href}`,
          is_scanned: false,
          error_count: 0,
          last_error: null
        }));

      } else if (["/01_-_Srila_Prabhupada/", "/02_-_ISKCON_Swamis/", "/03_-_ISKCON_Prabhujis/", "/05_-_ISKCON_Chowpatty/", "/06_-_More/"].includes(normalizedPath)) {
        // These root folders have directory indexing disabled on the server.
        // We define their known sub-directories to "bridge" into the rest of the library.
        const bridgeMap: Record<string, string[]> = {
          "/01_-_Srila_Prabhupada/": [
            "01_-_Lectures/", "02_-_Bhajans/", "03_-_Japa/"
          ],
          "/02_-_ISKCON_Swamis/": [
            "ISKCON_Swamis_-_A_to_C/", "ISKCON_Swamis_-_D_to_P/", "ISKCON_Swamis_-_R_to_Y/"
          ],
          "/03_-_ISKCON_Prabhujis/": [
            "ISKCON_Prabhujis_-_A_to_J/", "ISKCON_Prabhujis_-_K_to_R/", "ISKCON_Prabhujis_-_S_to_Y/"
          ],
          "/05_-_ISKCON_Chowpatty/": [
            "00_-_Bhajans/", "00_-_Kirtan_Fest/", "01+-+2004/", "02+-+2005/", "03+-+2006/", "04+-+2007/", "05+-+2008/", 
            "06+-+2009/", "07+-+2010/", "08_-_2011/", "09_-_2012/", "10_-_2013/", "11_-_2014/", "12_-_2015/", 
            "13_-_2016/", "14_-_2017/", "15_-_2018/", "16_-_2019/", "17_-_2020/", "18_-_2021/", "19_-_2022/", 
            "20_-_2023/", "21_-_2024/", "21_-_2025/", "22_-_2026/", "91_-_Prerna/", "92_-_Chetana/", 
            "93_-_Seminars/", "94_-_Festivals/", "96_-_Yatra/"
          ],
          "/06_-_More/": [
            "00_-_ISKCON_GEV/", "00_-_ISKCON_Vrindavan/", "01_-_ISKCON_Mayapur/", "01_-_ISKCON_Pune/", 
            "02_-_ISKCON_Juhu_Mumbai/", "03_-_ISKCON_Alachua/", "03_-_ISKCON_Austin/", "03_-_ISKCON_Bhopal/", 
            "03_-_ISKCON_CC_Bangalore/", "03_-_ISKCON_Kanpur/", "03_-_ISKCON_Mira_Road/", "03_-_ISKCON_Nigdi/", 
            "03_-_ISKCON_Radhadesh/", "04_-_ISKCON_Belgaum/", "04_-_ISKCON_London/", "04_-_ISKCON_Los_Angeles/", 
            "04_-_ISKCON_Melbourne/", "05_-_ISKCON_Balaramdesh/", "05_-_ISKCON_Birmingham/", "05_-_ISKCON_San_Diego/", 
            "05_-_ISKCON_Singapore/", "06_-_ISKCON_Mathuradesh/", "06_-_ISKCON_Zurich/", "06_-_Vaishnava_Saints/", 
            "07_-_ISKCON_Leicester/", "07_-_ISKCON_Noida/", "07_-_ISKCON_Philadelphia/", "07_-_ISKCON_Punjabi_Baugh/", 
            "08_-_ISKCON_Avataridesh/", "08_-_ISKCON_Canberra/", "08_-_ISKCON_Chicago/", "08_-_ISKCON_China/", 
            "08_-_ISKCON_Damodardesh/", "08_-_ISKCON_Delhi/", "08_-_ISKCON_Gainesville/", "08_-_ISKCON_Gauradesh/", 
            "08_-_ISKCON_Gurgaon/", "08_-_ISKCON_Hawaii/", "08_-_ISKCON_Kolhapur/", "08_-_ISKCON_Madurai/", 
            "08_-_ISKCON_Malaysia/", "08_-_ISKCON_Malda/", "08_-_ISKCON_Miraj/", "08_-_ISKCON_New_Gaya_Japan/", 
            "08_-_ISKCON_New_Jersey/", "08_-_ISKCON_Norway/", "09_-_Bhagavata_Vicara_-_Bengali/", 
            "09_-_Bhakti_Sanga_Conference_Classes/", "09_-_Bhaktivedanta_Hospital/", 
            "09_-_Complete_Valmiki_Ramayana_English_Translation/", "09_-_Govindas_Philadelphia/", 
            "10_-_Bhajans_and_Kirtans_-_Categories/", "10_-_Bhajans_and_Kirtans_-_Classical_and_Western/", 
            "10_-_Her_Grace_Ananda_Lila_Mataji/", "10_-_Her_Grace_Yamini_Mataji/", "11_-_Gopals_Studio/", 
            "11_-_Krishna_Stories_by_HG_Krishna_Kanti_Prabhu/", "12_-_Bhakti_Center%28New_York%29/", 
            "12_-_Bhakti_Sangam_Festival/", "13_-_Bhaktivedanta_College_Classes/", "13_-_Children_Stories/", 
            "50th+anniversary+ISKCON+New+York/", "Abhay_Charan_Movie_Vaishnava_Songs/", 
            "Audio_Book_Summary_by_HG_Gauranga_Darshan_Prabhu/", "Audio_Books/", "Bhagavad_Gita/", 
            "Bhagavad_Gita_Slokas_Recitation/", "Bhakti_Yoga_Training/", "Bhakti_Vriksha/", "Bilvamangala_Thakura/", 
            "Book_distribution/", "Chaitanya_Charitamrta/", "Damodar_Ashtakam/", "Drama_Sound_Track/", 
            "Educational/", "Enyclopedia_of_Srila_Prabhupada_Bhajans/", "E-Satsang/", "Family_Business/", 
            "Festivals/", "Gita_Daily_by_HG_Chaitanya_Charan_Prabhu/", "Govardhan_Puja/", "Gurushtakam/", 
            "Harinama_Sankirtan/", "Her_Grace_Shilpa_Mataji/", "His_Grace_Saci_Kumar_Prabhu/", "Holi_Festival/", 
            "Introductory_Presentations/", "ISKCON_700_Centres_Kirtan_Fest/", "ISKCON_BACE/", "ISKCON_News/", 
            "ISKCON_Studies_Conference/", "Jagannath_Puri_Yatra/", "Ketaki_Vaspate_Mataji/", "Miscellaneous/", 
            "NBS_Magazines/", "NBS_Weekly_Classes/", "Nectar_drops/", "Nrsimha_Drama_Sound_Track/", 
            "Original_Audio_from_Prabhupada_Connect/", "Pandava_Nirjala_Ekadashi/", "Prabhupada_Disciples/", 
            "Preaching_through_the_holy_name/", "Purushottama_Masa/", "Questions_and_Answers/", "Seminars/", 
            "Srila_Prabhupada/", "Srila_Prabhupada_Lilamrita_Reading/", "Srila_Prabhupada_Nectar/", 
            "Summaries_of_Srila_Prabhupada_Lectures_by_HG_Vanamali_Gopal_Prabhu/", "The_Journey_Home_Audio_Book/", 
            "The_Nectar_of_Instruction/", "Traditional_Srimad_Bhagavatam_Metre_Recitation/", "Tribute_to_Nandarani/", 
            "Unsorted/", "Upadesamrta_-_nectar_of_instruction/", "Vaishnava_Bhajans_by_various_devotees/", 
            "Vaishnava_Saints/", "Vaishnava_Songbook_Reading/", "Veda_Base_Audio_Transcripts/", "Vrindavan_Yatra/", 
            "Wats_App_Content/", "Webinars/", "Youth_Programs/"
          ]
        };

        const subfolders = bridgeMap[normalizedPath] || [];
        items = subfolders.map(href => {
          // Unescape + and %20 for display name
          const cleanName = decodeURIComponent(href.replace(/\+/g, " ")).replace(/\//g, "").replace(/_/g, " ");
          return {
            name: cleanName,
            type: "folder",
            url: "",
            parent_path: normalizedPath,
            full_path: `${normalizedPath}${href}`,
            is_scanned: false,
            error_count: 0,
            last_error: null
          };
        });
      } else {
        const fullUrl = buildFolderBrowseUrl(normalizedPath);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
          const response = await fetch(fullUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error(`Failed to fetch from IDKT: ${fullUrl} - Status: ${response.status}`);
            throw new Error(`Fetch failed: ${response.statusText} (${response.status})`);
          }
          
          const html = await response.text();
          items = parseIdktItemsFromHtml(html, normalizedPath);
        } catch (err: unknown) {
          clearTimeout(timeoutId);
          const errorMessage = getErrorMessage(err);
          console.error(`Crawl error for ${normalizedPath}:`, errorMessage);
          
          // Update failure stats if not root
          if (normalizedPath !== "/") {
            const { data: current } = await supabaseIdktAdmin.from("idkt_items").select("error_count").eq("full_path", normalizedPath).single();
            const newCount = (current?.error_count || 0) + 1;
            
            await supabaseIdktAdmin.from("idkt_items").update({
              error_count: newCount,
              last_error: errorMessage,
              is_scanned: newCount >= 3 // Give up after 3 tries
            }).eq("full_path", normalizedPath);
          }
          throw err;
        }
      }

      if (items.length > 0) {
        const { error } = await supabaseIdktAdmin
          .from("idkt_items")
          .upsert(items, { onConflict: "full_path" });
        if (error) throw error;
      }

      // If this is the root or a new discovery, ensure the folder itself exists in DB
      // before marking it as scanned.
      if (normalizedPath === "/") {
        const { error: rootError } = await supabaseIdktAdmin.from("idkt_items").upsert({
          name: "Home",
          type: "folder",
          url: "",
          parent_path: "",
          full_path: "/",
          is_scanned: true
        }, { onConflict: "full_path" });
        if (rootError) throw rootError;
      } else {
        // Ensure folder row exists even if discovered from URL-only scans.
        await supabaseIdktAdmin.from("idkt_items").upsert({
          name: decodeURIComponent(normalizedPath.split("/").filter(Boolean).pop() || "Folder").replace(/_/g, " "),
          type: "folder",
          url: "",
          parent_path: normalizeFolderPath(normalizedPath.split("/").slice(0, -2).join("/") || "/"),
          full_path: normalizedPath,
          is_scanned: false,
          error_count: 0,
          last_error: null
        }, { onConflict: "full_path" });

        // Mark the current folder as scanned
        await supabaseIdktAdmin
          .from("idkt_items")
          .update({ is_scanned: true })
          .eq("full_path", normalizedPath);
      }

      return NextResponse.json({ 
        success: true, 
        items_found: items.length,
        folders: items.filter(i => i.type === "folder").map(i => i.full_path)
      });
    }

    if (action === "inject_folder") {
      const { parent_path, folder_name } = body;
      const full_path = parent_path === "/" ? `/${folder_name}/` : `${parent_path}${folder_name}/`;
      
      const { error } = await supabaseIdktAdmin.from("idkt_items").upsert({
        name: folder_name.replace(/\//g, ""),
        type: "folder",
        url: "",
        parent_path: parent_path,
        full_path: full_path,
        is_scanned: false,
        error_count: 0,
        last_error: null
      }, { onConflict: "full_path" });
      
      if (error) throw error;
      
      return NextResponse.json({ success: true, injected: full_path });
    }

    if (action === "get_status") {
      const { priority_path } = body;
      
      // Return total counts and pending folders
      const { count: total } = await supabaseIdktAdmin.from("idkt_items").select("*", { count: 'exact', head: true });
      const { count: pending } = await supabaseIdktAdmin
        .from("idkt_items")
        .select("*", { count: 'exact', head: true })
        .eq("type", "folder")
        .eq("is_scanned", false)
        .or("error_count.is.null,error_count.lt.3");
      
      let firstPending: { full_path: string }[] | null = null;

      // 1. Try to find the first pending folder within the priority branch
      if (priority_path && priority_path !== "/") {
        const { data } = await supabaseIdktAdmin.from("idkt_items")
          .select("full_path")
          .eq("is_scanned", false)
          .eq("type", "folder")
          .or("error_count.is.null,error_count.lt.3")
          .like("full_path", `${priority_path}%`)
          .order("full_path", { ascending: true })
          .limit(1);
        if (data && data.length > 0) firstPending = data;
      }

      // 2. Fall back to global ONLY if no priority path was specified
      if (!firstPending) {
        if (priority_path && priority_path !== "/") {
          // STRICT SCOPING: Stop the scan here because the requested branch is finished
          console.log("Strict Scoping: Branch complete for", priority_path);
          return NextResponse.json({ 
            total, 
            pending, 
            next: null 
          });
        }

        // Global fallback (only for home-initiated Global Sync)
        const { data } = await supabaseIdktAdmin.from("idkt_items")
          .select("full_path")
          .eq("type", "folder")
          .eq("is_scanned", false)
          .or("error_count.is.null,error_count.lt.3")
          .order("full_path", { ascending: true })
          .limit(1);
        firstPending = data;
      }

      return NextResponse.json({ 
        total, 
        pending, 
        next: firstPending?.[0]?.full_path || null 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Crawl error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
