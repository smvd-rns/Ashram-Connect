import { createClient } from '@supabase/supabase-js';

const supabaseIdktUrl = process.env.NEXT_PUBLIC_SUPABASE_IDKT_URL!;
const supabaseIdktAnonKey = process.env.NEXT_PUBLIC_SUPABASE_IDKT_ANON_KEY!;

export const supabaseIdkt = createClient(supabaseIdktUrl, supabaseIdktAnonKey);

const supabaseIdktServiceRoleKey = process.env.SUPABASE_IDKT_SERVICE_ROLE_KEY;
export const supabaseIdktAdmin = supabaseIdktServiceRoleKey
  ? createClient(supabaseIdktUrl, supabaseIdktServiceRoleKey)
  : null;
