const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('physical_attendance')
    .select('zk_user_id, check_time, device_sn, raw_payload')
    .limit(100);

  let c1 = 0, c2 = 0;
  data.forEach(log => {
      const d = new Date(log.check_time);
      
      // Approach 1: Convert to IST (Current buggy logic)
      const istTime = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      
      // Approach 2: Just look at the UTC time (Treat original input as literal string)
      const rawTimeStr = log.check_time.substring(11, 19);

      if (istTime >= '02:00:00' && istTime <= '07:30:00') c1++;
      if (rawTimeStr >= '02:00:00' && rawTimeStr <= '07:30:00') c2++;
  });
  
  console.log("Count with IST +5:30 offset:", c1);
  console.log("Count ignoring timezone (Raw UTC string):", c2);
}

check();
