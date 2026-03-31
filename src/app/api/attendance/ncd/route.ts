import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * DEDICATED ENDPOINT FOR SECOND MACHINE (NCD8253500015)
 * Providing a clean, separate URL for the user to troubleshoot communication.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");

  // LOG ALL HITS - NO SN CHECK FOR DEBUGGING
  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "NCD-OPEN",
    zk_user_id: "NCD_DEBUG_GET",
    raw_payload: `URL: ${req.url} | Params: ${searchParams.toString()}`
  }]);

  // Respond "OK" for handshake
  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");
  const table = searchParams.get("table");
  const text = await req.text();

  // LOG ALL HITS - NO SN CHECK FOR DEBUGGING
  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "NCD-OPEN",
    zk_user_id: "NCD_DEBUG_POST",
    raw_payload: `Table: ${table} | Body: ${text.slice(0, 500)}`
  }]);

  // Standard logic to process logs if it's ATTLOG
  if (table === "ATTLOG") {
    const lines = text.trim().split("\n");
    const logs = lines.filter(l => l.trim()).map(line => {
        const parts = line.split("\t"); 
        return {
            device_sn: sn || "NCD8253500015",
            zk_user_id: parts[0] || "0",
            check_time: parts[1] || new Date().toISOString(),
            status: parseInt(parts[2]) || 0,
            verify_type: parseInt(parts[3]) || 0,
            raw_payload: line
        };
    });

    if (logs.length > 0) {
      await supabase.from("physical_attendance").insert(logs);
    }
  }

  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
