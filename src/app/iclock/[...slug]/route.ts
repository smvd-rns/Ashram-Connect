import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CATCH-ALL DIAGNOSTIC ROUTE
 * Logs ANY request hitting /iclock/* to help identify the machine's preferred path and SN format.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug.join("/");
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");

  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "CATCH_ALL",
    zk_user_id: "DIAGNOSTIC_GET",
    raw_payload: `Path: /iclock/${path} | Params: ${searchParams.toString()}`
  }]);

  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const path = params.slug.join("/");
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");
  const text = await req.text();

  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "CATCH_ALL",
    zk_user_id: "DIAGNOSTIC_POST",
    raw_payload: `Path: /iclock/${path} | Body: ${text.slice(0, 500)}`
  }]);

  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
