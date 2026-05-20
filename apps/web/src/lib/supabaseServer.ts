import { createClient } from '@supabase/supabase-js';

// Server-only client: uses service role key (bypasses RLS) when available,
// falls back to anon key. Never exposed to the browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const key = serviceKey || anonKey;

export const supabaseServer =
  url && key
    ? createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
