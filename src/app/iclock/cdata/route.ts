import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * ZK-ADMS COMPATIBILITY LAYER - Optimized for Multiple ZKTeco Devices
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Whitelist of machine serial numbers allowed to push data
const AUTHORIZED_SNS = [
  "TFEE255000216", 
  "NCD8253500015"
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN")?.toUpperCase();

  if (!sn || !AUTHORIZED_SNS.includes(sn)) {
    return new Response("UNAUTHORIZED_DEVICE", { status: 401 });
  }

  return new Response("OK", {
    headers: { 
      "Content-Type": "text/plain",
      "Server": "ZK Web Server" 
    }
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN")?.toUpperCase();
  const table = searchParams.get("table");

  if (!sn || !AUTHORIZED_SNS.includes(sn)) {
    return new Response("UNAUTHORIZED_DEVICE", { status: 401 });
  }

  try {
    const text = await req.text();
    
    // Handle ATTLOG or OPLOG
    if (table === "ATTLOG" || table === "OPLOG" || text.includes("ATTLOG") || text.includes("OPLOG")) {
      const lines = text.trim().split("\n");
      const logs: any[] = [];
      
      lines.forEach(line => {
          if (!line.trim()) return;
          const parts = line.split("\t"); 
          
          let userId = "0";
          let timestampStr = "";
          let status = 0;
          let verifyType = 0;

          if (parts[0].includes("ATTLOG")) {
             userId = parts[0].split(" ").pop() || "0";
             timestampStr = parts[1] || "";
             status = parseInt(parts[2]) || 0;
             verifyType = parseInt(parts[3]) || 0;
          } else if (parts[0].includes("OPLOG")) {
             userId = parts[3] || parts[1] || "0";
             timestampStr = parts[2] || "";
          } else {
             userId = parts[0] || "0";
             timestampStr = parts[1] || "";
             status = parseInt(parts[2]) || 0;
             verifyType = parseInt(parts[3]) || 0;
          }

          // PRODUCTION FILTER: Only 2:00 AM to 7:30 AM
          if (timestampStr) {
             const timeParts = timestampStr.split(" ")[1];
             if (timeParts) {
                const [h, m] = timeParts.split(":").map(Number);
                const isInWindow = (h > 2 && h < 7) || (h === 2) || (h === 7 && m <= 30);
                
                if (isInWindow) {
                   logs.push({
                       device_sn: sn,
                       zk_user_id: userId,
                       check_time: timestampStr,
                       status,
                       verify_type: verifyType,
                       raw_payload: line
                   });
                }
             }
          }
      });

      if (logs.length > 0) {
        await supabase.from("physical_attendance").insert(logs);
      }
    }

    return new Response("OK", {
      headers: { "Content-Type": "text/plain", "Server": "ZK Web Server" }
    });

  } catch (error: any) {
    return new Response("OK", { status: 200 });
  }
}
