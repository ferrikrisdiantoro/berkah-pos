import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client dengan service role — HANYA untuk server (Route Handler /
 * Server Component). Mem-bypass RLS, jadi jangan pernah diekspos ke browser.
 * Dipakai di rute publik share untuk menghitung agregat (mis. total hutang)
 * yang tak bisa dibaca anon lewat RLS.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum di-set di server.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
