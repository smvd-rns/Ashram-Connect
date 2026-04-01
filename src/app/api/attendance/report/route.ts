import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ATTENDANCE REPORT API
 * Generates matrix-style reports for all 3 machines.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];
    const userEmail = searchParams.get("email"); // Optional: for admin to filter deep

    // 1. Fetch all machines to know the sessions
    const { data: machines, error: machinesError } = await supabase.from("attendance_machines").select("*");
    if (machinesError) throw machinesError;
    const machinesList = machines || [];

    // 2. Fetch all mappings to link logs to emails
    let mappingQuery = supabase.from("attendance_user_mapping").select("*, profile:profiles(full_name)");
    const { data: mappings, error: mappingsError } = await mappingQuery;
    if (mappingsError) throw mappingsError;
    const mappingsList = mappings || [];

    // 3. Fetch logs for the range
    let logsQuery = supabase
      .from("physical_attendance")
      .select("*")
      .gte("check_time", `${startDate}T00:00:00Z`)
      .lte("check_time", `${endDate}T23:59:59Z`);
    
    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) throw logsError;
    const logsList = logs || [];

    // 4. Transform into Matrix structure
    const matrix: any = {};

    mappingsList.forEach(m => {
      if (!matrix[m.user_email]) {
        matrix[m.user_email] = {
          email: m.user_email,
          full_name: m.profile?.full_name || "Guest",
          dates: {}
        };
      }
    });

    logsList.forEach(log => {
      const machine = machinesList.find(mac => mac.serial_number === log.device_sn);
      if (!machine) return;

      const mapping = mappingsList.find(m => m.machine_id === machine.id && m.zk_user_id === log.zk_user_id);
      if (!mapping) return;

      const email = mapping.user_email;
      const date = new Date(log.check_time).toISOString().split('T')[0];
      const sessionName = machine.description || log.device_sn;

      if (matrix[email]) {
        if (!matrix[email].dates[date]) {
          matrix[email].dates[date] = {};
        }
        if (!matrix[email].dates[date][sessionName]) {
          matrix[email].dates[date][sessionName] = [];
        }

        // Status Logic: Dual Window (P, L, A)
        const checkTimeStr = new Date(log.check_time).toLocaleTimeString('en-GB', { hour12: false });
        let status = "absent";

        if (checkTimeStr >= machine.p_start && checkTimeStr <= machine.p_end) {
          status = "present";
        } else if (checkTimeStr >= machine.l_start && checkTimeStr <= machine.l_end) {
          status = "late";
        }

        matrix[email].dates[date][sessionName].push({
          ...log,
          computed_status: status
        });
      }
    });

    return NextResponse.json({ 
      report: Object.values(matrix),
      machines: machinesList 
    });

  } catch (error: any) {
    console.error("Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
