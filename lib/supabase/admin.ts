import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Service-role client: bypasses RLS entirely. Only import this from server-only
// code paths that have no Supabase user session to act as -- the WhatsApp
// webhook and the cron expiry route. Never import this into client components
// or expose the service role key to the browser bundle.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
