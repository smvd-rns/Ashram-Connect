import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * ZK-ADMS COMPATIBILITY LAYER
 * Many ZKTeco machines automatically append "/iclock/cdata" to the server URL.
 * This API handles both direct hits and the standard ADMS handshake.
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
  const sn = searchParams.get("SN");

  // Log the attempt (for debugging)
  console.log(`[ZK-DEBUG] GET handshake from SN: ${sn}`);

  const sn_upper = sn?.toUpperCase();
  const isAuthorized = sn_upper && AUTHORIZED_SNS.includes(sn_upper);

  // NO SN CHECK FOR DEBUGGING - LOG EVERYTHING
  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "ZK-OPEN",
    zk_user_id: "ZK_DEBUG_GET",
    raw_payload: `Handshake attempt from SN: ${sn}`
  }]);

  // ZKTeco Expects "OK" in plain text
  return new Response("OK", {
    headers: { "Content-Type": "text/plain" }
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get("SN");
  const table = searchParams.get("table");

  console.log(`[ZK-DEBUG] POST data from SN: ${sn}, Table: ${table}`);

  const sn_upper = sn?.toUpperCase();
  const isAuthorized = sn_upper && AUTHORIZED_SNS.includes(sn_upper);

  // NO SN CHECK FOR DEBUGGING - LOG EVERYTHING
  await supabase.from("physical_attendance").insert([{
    device_sn: sn || "ZK-OPEN",
    zk_user_id: "ZK_DEBUG_POST",
    raw_payload: `Data push attempt from SN: ${sn} | Table: ${table}`
  }]);

  try {
    const text = await req.text();
    
    // Log the raw payload to Supabase for debugging (Very Helpful!)
    await supabase.from("physical_attendance").insert([{
      device_sn: sn || "UNKNOWN",
      zk_user_id: "DEBUG",
      raw_payload: `TABLE: ${table} | BODY: ${text.slice(0, 500)}`
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
      headers: { "Content-Type": "text/plain" }
    });

  } catch (error: any) {
    console.error("[ZK-DEBUG] Error:", error.message);
    return new Response("OK", { status: 200 }); // Return 200/OK anyway to prevent machine from retrying/stalling
  }
}
