import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_YT_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_YT_ANON_KEY!

// Client for public access (RLS)
export const supabaseYt = createClient(supabaseUrl, supabaseAnonKey)

// Admin client using service role key to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_YT_SERVICE_ROLE_KEY
export const supabaseYtAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null
