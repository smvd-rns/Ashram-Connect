import { NextRequest, NextResponse } from "next/server";
import { supabaseIdktAdmin } from "@/lib/supabaseIdkt";

function normalizeFolderPath(path: string) {
  if (!path || path === "/") return "/";
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeItem(item: any) {
  const type = item.type === "folder" ? "folder" : "audio";
  const parent_path = normalizeFolderPath(String(item.parent_path || "/"));
  let full_path = String(item.full_path || "").trim();
  if (!full_path) {
    throw new Error("Each item must include a full_path.");
  }

  if (type === "folder") {
    full_path = full_path.endsWith("/") ? full_path : `${full_path}/`;
  } else {
    full_path = full_path.endsWith("/") ? full_path.slice(0, -1) : full_path;
  }

  const url = String(item.url || full_path);
  const name = String(item.name || "").trim();
  if (!name) {
    throw new Error("Each item must include a name.");
  }

  let last_modified = null;
  if (item.last_modified) {
    const date = new Date(item.last_modified);
    if (!Number.isNaN(date.valueOf())) {
      last_modified = date.toISOString();
    }
  }

  return {
    name,
    type,
    url,
    parent_path,
    full_path,
    size: item.size ? String(item.size) : null,
    last_modified,
    is_scanned: Boolean(item.is_scanned),
    is_hidden: Boolean(item.is_hidden),
    error_count: Number(item.error_count || 0),
    last_error: item.last_error ? String(item.last_error) : null,
  };
}

export async function POST(req: NextRequest) {
  if (!supabaseIdktAdmin) {
    return NextResponse.json({ error: "Supabase service role key missing" }, { status: 500 });
  }

  try {
    const { items, userRole } = await req.json();

    if (Number(userRole) !== 1) {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Import payload must contain an array of items." }, { status: 400 });
    }

    const normalizedItems = items.map(normalizeItem);
    const { error } = await supabaseIdktAdmin.from("idkt_items").upsert(normalizedItems, { onConflict: "full_path" });
    if (error) throw error;

    return NextResponse.json({ success: true, imported: normalizedItems.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
