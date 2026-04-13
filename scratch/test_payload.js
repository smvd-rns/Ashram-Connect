const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('physical_attendance')
    .select('check_time, raw_payload')
    .order('check_time', { ascending: false })
    .limit(300);

  let sample = [];
  data.forEach(log => {
      const d = new Date(log.check_time);
      const utc = d.toISOString().split('T')[1].split('.')[0]; // UTC time
      const res = { orig: log.check_time, utcTime: utc, raw: log.raw_payload };
      sample.push(res);
  });
  
  console.log("Samples:", sample[0], sample[Math.floor(sample.length/2)], sample[sample.length-1]);
}

check();
