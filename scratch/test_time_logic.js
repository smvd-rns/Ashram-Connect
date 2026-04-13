const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('id', 'global')
    .single();

  const machineId = data.prasadam_machine_ids[0];

  const { data: mc } = await supabase.from('attendance_machines').select('serial_number').eq('id', machineId).single();
  
  console.log("Using Machine SN:", mc.serial_number);

  const { data: logs, error: logErr } = await supabase
    .from('physical_attendance')
    .select('zk_user_id, check_time, device_sn')
    .eq('device_sn', mc.serial_number);

  let counts = 0;
  let matches = [];
  logs.forEach(log => {
    const d = new Date(log.check_time);
    const istTime = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    
    // The user's device check_time might be stored in UTC but meant to be IST or vice versa.
    // The user says "now take another eg machine user id 10 check time for day is 4:30 AM and later check in at 7:25". 
    // They uploaded an image where check_time is stored as TIMESTAMPTZ.
    if (istTime >= data.prasadam_start_time && istTime <= data.prasadam_end_time) {
      counts++;
      matches.push({ id: log.zk_user_id, istDate, istTime, orig: log.check_time });
    }
  });

  console.log("Total punches within time window:", counts);
  // group by date
  let grouped = {};
  matches.forEach(m => {
    if (!grouped[m.istDate]) grouped[m.istDate] = new Set();
    grouped[m.istDate].add(m.id);
  });
  
  console.log("By Date:", grouped);
}

check();
