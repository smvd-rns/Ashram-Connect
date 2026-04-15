import { createClient } from '@supabase/supabase-js';

const supabaseIdktUrl = process.env.NEXT_PUBLIC_SUPABASE_IDKT_URL;
const supabaseIdktAnonKey = process.env.NEXT_PUBLIC_SUPABASE_IDKT_ANON_KEY;

export const supabaseIdkt = (supabaseIdktUrl && supabaseIdktAnonKey && supabaseIdktUrl.startsWith('http'))
  ? createClient(supabaseIdktUrl, supabaseIdktAnonKey)
  : null;

const supabaseIdktServiceRoleKey = process.env.SUPABASE_IDKT_SERVICE_ROLE_KEY;
export const supabaseIdktAdmin = (supabaseIdktUrl && supabaseIdktServiceRoleKey && supabaseIdktUrl.startsWith('http'))
  ? createClient(supabaseIdktUrl, supabaseIdktServiceRoleKey)
  : null;
