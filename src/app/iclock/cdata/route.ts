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

  if (!sn) return new Response("SN_REQUIRED", { status: 400 });

  const { data: machine } = await supabase
    .from("attendance_machines")
    .select("is_active, ingestion_start, ingestion_end")
    .eq("serial_number", sn)
    .eq("is_active", true)
    .single();

  if (!machine) {
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

  if (!sn) return new Response("SN_REQUIRED", { status: 400 });

  const { data: machine } = await supabase
    .from("attendance_machines")
    .select("is_active, ingestion_start, ingestion_end")
    .eq("serial_number", sn)
    .eq("is_active", true)
    .single();

  if (!machine) {
    return new Response("UNAUTHORIZED_DEVICE", { status: 401 });
  }

  const { data: settings } = await supabase
    .from("attendance_settings")
    .select("*")
    .eq("id", "global")
    .single();

  const startTime = machine.ingestion_start || "02:00:00";
  const endTime = machine.ingestion_end || "11:00:00";
  const syncFromDate = settings?.sync_from_date ? new Date(settings.sync_from_date) : new Date();

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

           // 1. Explicit OPLOG filter
           if (line.includes("OPLOG") || parts[0].includes("OPLOG")) {
              return; 
           }

           if (parts[0].includes("ATTLOG")) {
              userId = parts[0].split(" ").pop() || "0";
              timestampStr = parts[1] || "";
              status = parseInt(parts[2]) || 0;
              verifyType = parseInt(parts[3]) || 0;
           } else {
              userId = parts[0] || "0";
              timestampStr = parts[1] || "";
              status = parseInt(parts[2]) || 0;
              verifyType = parseInt(parts[3]) || 0;
           }

           // 2. Filter out invalid/non-user entries
           if (userId === "0" || !userId || userId.toLowerCase() === "null") {
              return;
           }

           // DYNAMIC FILTERS
           if (timestampStr) {
             const [dateStr, timeStr] = timestampStr.split(" ");
             const recordDate = new Date(dateStr);
             
             if (recordDate < syncFromDate) return;

             if (timeStr) {
                const [h, m] = timeStr.split(":").map(Number);
                const [startH, startM] = startTime.split(":").map(Number);
                const [endH, endM] = endTime.split(":").map(Number);
                
                const recMinutes = h * 60 + m;
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                if (recMinutes >= startMinutes && recMinutes <= endMinutes) {
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
