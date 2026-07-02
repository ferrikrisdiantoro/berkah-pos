"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Menjalankan Supabase client di browser agar token di-refresh otomatis di
 * latar belakang (mencegah ter-logout mendadak saat token kadaluarsa).
 * Menyinkronkan state saat token diperbarui atau user keluar.
 */
export function SessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
