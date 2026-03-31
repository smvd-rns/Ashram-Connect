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

  if (!sn || !AUTHORIZED_SNS.map(s => s.toUpperCase()).includes(sn)) {
    console.warn(`[ZK-HANDSHAKE] Unauthorized SN: ${sn}`);
    return new Response("UNAUTHORIZED_DEVICE", { status: 401 });
  }

  console.log(`[ZK-HANDSHAKE] SUCCESS for SN: ${sn}`);

  // Standard ZK ADMS Handshake response
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

  if (!sn || !AUTHORIZED_SNS.map(s => s.toUpperCase()).includes(sn)) {
    return new Response("UNAUTHORIZED_DEVICE", { status: 401 });
  }

  try {
    const text = await req.text();
    
    // BACKUP LOG: If anything hits, we log it immediately to help you debug
    await supabase.from("physical_attendance").insert([{
      device_sn: sn,
      zk_user_id: "HEARTBEAT",
      raw_payload: `Table: ${table} | Content: ${text.slice(0, 100)}`
    }]);

    if (table === "ATTLOG") {
      const lines = text.trim().split("\n");
      const logs = lines.filter(l => l.trim()).map(line => {
          const parts = line.split("\t"); 
          return {
              device_sn: sn,
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

    return new Response("OK", {
      headers: { "Content-Type": "text/plain", "Server": "ZK Web Server" }
    });

  } catch (error: any) {
    return new Response("OK", { status: 200 });
  }
}
