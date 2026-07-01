import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk komponen "use client".
 * Aman dipanggil di browser — hanya memakai anon key publik.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
