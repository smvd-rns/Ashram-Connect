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

export async function GET(req: NextRequest) {
  if (!supabaseIdktAdmin) {
    return NextResponse.json({ error: "Supabase service role key missing" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawPath = searchParams.get("path") || "all";
    const role = Number(searchParams.get("role") || 0);
    const normalizedPath = normalizeFolderPath(rawPath);

    if (role !== 1) {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const buildQuery = () => {
      let query = supabaseIdktAdmin.from("idkt_items").select("id, name, type, url, parent_path, full_path, size, last_modified, is_scanned, is_hidden, created_at, error_count, last_error");
      if (rawPath !== "all" && normalizedPath !== "/") {
        query = query.or(`full_path.eq."${normalizedPath}",full_path.like."${normalizedPath}%"`);
      }
      return query;
    };

    const allItems: any[] = [];
    const pageSize = 1000;
    let offset = 0;
    let pageItems: any[] = [];

    do {
      const { data, error } = await buildQuery()
        .order("full_path", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      pageItems = data || [];
      allItems.push(...pageItems);
      offset += pageSize;
    } while (pageItems.length === pageSize);

    return NextResponse.json({ items: allItems });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
