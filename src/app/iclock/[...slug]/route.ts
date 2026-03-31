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
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");

  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "CATCH_ALL",
    zk_user_id: "DIAGNOSTIC_GET",
    raw_payload: `Path: /iclock/${path} | Params: ${searchParams.toString()}`
  }]);

  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");
  const tableParam = searchParams.get("table");
  const text = await req.text();

  // Log the raw push for debugging
  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "CATCH_ALL",
    zk_user_id: "DIAGNOSTIC_POST",
    raw_payload: `Path: /iclock/${path} | Table: ${tableParam} | Body: ${text.slice(0, 500)}`
  }]);

  // Handle ATTLOG or OPLOG (eSSL/ZKTeco Push Protocol)
  if (text.includes("ATTLOG") || text.includes("OPLOG") || tableParam?.includes("ATTLOG") || tableParam?.includes("OPLOG")) {
      const lines = text.trim().split("\n");
      const logs: any[] = [];
      
      lines.forEach(line => {
          if (!line.trim()) return;
          const parts = line.split("\t"); 
          
          let userId = "0";
          let timestamp = new Date().toISOString();
          let status = 0;
          let verifyType = 0;

          // Format A: "ATTLOG 99\t2026-04-01 08:00:00\t0\t1..."
          if (parts[0].includes("ATTLOG")) {
             userId = parts[0].split(" ").pop() || "0";
             timestamp = parts[1] || timestamp;
             status = parseInt(parts[2]) || 0;
             verifyType = parseInt(parts[3]) || 0;
          } 
          // Format B: "OPLOG 101\t0\t2026-03-28 07:58:28\t118..."
          else if (parts[0].includes("OPLOG")) {
             // For OPLOG, the user ID is often in columns 3 or 4
             userId = parts[3] || parts[1] || "0";
             timestamp = parts[2] || timestamp;
          }
          // Format C: Standard tab-separated "99\t2026-04-01 08:00:00\t0\t1..."
          else {
             userId = parts[0] || "0";
             timestamp = parts[1] || timestamp;
             status = parseInt(parts[2]) || 0;
             verifyType = parseInt(parts[3]) || 0;
          }

          logs.push({
              device_sn: sn || "NCD8253500015",
              zk_user_id: userId,
              check_time: timestamp,
              status: status,
              verify_type: verifyType,
              raw_payload: line
          });
      });

      if (logs.length > 0) {
        await supabase.from("physical_attendance").insert(logs);
      }
  }

  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
