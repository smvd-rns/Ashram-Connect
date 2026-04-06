import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ATTENDANCE REPORT API
 * Generates matrix-style reports for all machines.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];

    // 1. Fetch all machines to know the sessions
    const { data: machines, error: machinesError } = await supabase
      .from("attendance_machines")
      .select("*");
    if (machinesError) throw machinesError;
    const machinesList = machines || [];

    // 2. Fetch all mappings (plain — no join to avoid schema cache issues)
    const { data: mappings, error: mappingsError } = await supabase
      .from("attendance_user_mapping")
      .select("*");
    if (mappingsError) throw mappingsError;
    const mappingsList = mappings || [];

    // 3. Fetch BCDB users (Only temple Brahmacharis should have access to Harinam)
    const { data: bcdbUsers, error: bcdbError } = await supabase
      .from("bcdb")
      .select("email_id, initiated_name, legal_name")
      .eq("is_deleted", false);
    if (bcdbError) throw bcdbError;

    // 4. Fetch logs for the date range with pagination to bypass Supabase 1000-row max default
    let logsList: any[] = [];
    let hasMoreLogs = true;
    let logPage = 0;
    const limit = 1000;

    while (hasMoreLogs) {
      const { data: chunk, error: chunkError } = await supabase
        .from("physical_attendance")
        .select("*")
        .gte("check_time", `${startDate}T00:00:00Z`)
        .lte("check_time", `${endDate}T23:59:59Z`)
        .range(logPage * limit, (logPage + 1) * limit - 1);

      if (chunkError) throw chunkError;

      if (chunk && chunk.length > 0) {
        logsList = [...logsList, ...chunk];
      }

      if (!chunk || chunk.length < limit) {
        hasMoreLogs = false;
      } else {
        logPage++;
      }
    }

    // 5. Build matrix: user → date → session → [logs]
    const matrix: any = {};

    // Pre-populate matrix with BCDB users and grant them Harinam access
    (bcdbUsers || []).forEach(u => {
      if (!u.email_id) return;
      matrix[u.email_id] = {
        email: u.email_id,
        full_name: u.initiated_name || u.legal_name || u.email_id.split("@")[0],
        assigned_machines: ["harinam_virtual"],
        dates: {}
      };
    });

    // Fallback dictionary for physical mappers not in BCDB
    const emails = [...new Set(mappingsList.map(m => m.user_email))];
    const { data: profiles } = await supabase.from("profiles").select("email, full_name").in("email", emails);
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.email] = p.full_name; });

    // Pre-populate hardware assigned_machines from mappings
    mappingsList.forEach(m => {
      if (!matrix[m.user_email]) {
        matrix[m.user_email] = {
          email: m.user_email,
          full_name: profileMap[m.user_email] || m.user_email.split("@")[0],
          assigned_machines: [],
          dates: {}
        };
      }
      if (!matrix[m.user_email].assigned_machines.includes(m.machine_id)) {
        matrix[m.user_email].assigned_machines.push(m.machine_id);
      }
    });

    // Populate logs into matrix
    logsList.forEach(log => {
      const matchingMachines = machinesList.filter(mac => mac.serial_number === log.device_sn);
      matchingMachines.forEach(machine => {
        const mapping = mappingsList.find(
          m => m.machine_id === machine.id && String(m.zk_user_id) === String(log.zk_user_id)
        );
        if (!mapping) return;
        const email = mapping.user_email;
        if (!matrix[email]) return;
        const date = new Date(log.check_time).toISOString().split('T')[0];
        const sessionName = machine.description || log.device_sn;
        if (!matrix[email].dates[date]) matrix[email].dates[date] = {};
        if (!matrix[email].dates[date][sessionName]) matrix[email].dates[date][sessionName] = [];
        matrix[email].dates[date][sessionName].push(log);
      });
    });

    // --- HARINAM INTEGRATION ---
    let harinamDataList: any[] = [];
    let hasMoreHarinam = true;
    let hPage = 0;

    while (hasMoreHarinam) {
      const { data: chunk, error: hError } = await supabase
        .from("harinam_attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .range(hPage * limit, (hPage + 1) * limit - 1);

      if (hError) throw hError;

      if (chunk && chunk.length > 0) {
        harinamDataList = [...harinamDataList, ...chunk];
      }

      if (!chunk || chunk.length < limit) {
        hasMoreHarinam = false;
      } else {
        hPage++;
      }
    }

    const harinamVirtualMachine = {
      id: "harinam_virtual",
      serial_number: "VIRTUAL_HARINAM",
      description: "Hari Nam",
      is_manual: true,
      p_start: "07:00:00",
      p_end: "09:00:00"
    };
    
    machinesList.push(harinamVirtualMachine);

    (harinamDataList || []).forEach((record: any) => {
      const email = record.user_email;
      if (!matrix[email]) return;
      const date = record.date;
      if (!matrix[email].dates[date]) matrix[email].dates[date] = {};
      matrix[email].dates[date]["Hari Nam"] = [{
        is_manual: true,
        ...record
      }];
    });
    // Add "Hari Nam" to assigned machines for ALL users so they show up in Harinam view
    Object.values(matrix).forEach((user: any) => {
       if (!user.assigned_machines.includes("harinam_virtual")) {
          user.assigned_machines.push("harinam_virtual");
       }
    });
    // --- END HARINAM ---

    // 6. Compute status per session per day using the EARLIEST punch only
    Object.values(matrix).forEach((user: any) => {
      Object.values(user.dates).forEach((dateSessions: any) => {
        Object.entries(dateSessions).forEach(([sessionName, sessionLogs]: [string, any]) => {
          if (!sessionLogs || sessionLogs.length === 0) return;

          // Skip status calculation for manual sessions
          if (sessionLogs[0].is_manual) return;

          const machine = machinesList.find(m => (m.description || m.serial_number) === sessionName);
          if (!machine) return;

          const earliest = sessionLogs.reduce((min: any, log: any) =>
            new Date(log.check_time) < new Date(min.check_time) ? log : min
          , sessionLogs[0]);

          const checkTimeStr = new Date(earliest.check_time).toISOString().slice(11, 19);

          let status = "absent";
          if (machine.p_start && machine.p_end && checkTimeStr >= machine.p_start && checkTimeStr <= machine.p_end) {
            status = "present";
          } else if (machine.l_start && machine.l_end && checkTimeStr >= machine.l_start && checkTimeStr <= machine.l_end) {
            status = "late";
          }

          dateSessions[sessionName] = sessionLogs.map((log: any) => ({
            ...log,
            computed_status: status,
            is_earliest: log === earliest
          }));
        });
      });
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
