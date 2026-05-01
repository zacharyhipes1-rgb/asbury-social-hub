import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing env vars. Make sure VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY are set in .env.local (local) and in the ' +
    'Vercel project settings (production).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
