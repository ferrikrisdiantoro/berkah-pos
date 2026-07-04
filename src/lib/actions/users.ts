"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster, type Role } from "@/lib/auth";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Admin REST API (pakai fetch agar kompatibel Node 20 & Vercel). */
async function adminFetch(path: string, init: RequestInit = {}) {
  if (!SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum di-set di server (Vercel: Settings → Environment Variables).",
    );
  }
  const res = await fetch(`${SUPA_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.msg || body?.error_description || body?.error || "Gagal.");
  }
  return body;
}

export interface StaffRow {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  isActive: boolean;
}

/** Daftar semua pengguna (email dari Auth + peran dari profiles). */
export async function listUsers(): Promise<StaffRow[]> {
  await requireMaster();
  const supabase = await createClient();

  const [{ data: profiles }, authBody] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, is_active"),
    adminFetch("/admin/users?per_page=200"),
  ]);

  const emailById = new Map<string, string>();
  for (const u of authBody.users ?? []) emailById.set(u.id, u.email ?? "");

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? "—",
    fullName: p.full_name,
    role: (p.role as Role) ?? "staff",
    isActive: p.is_active,
  }));
}

export async function createUserAction(formData: FormData) {
  await requireMaster();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = (String(formData.get("role") ?? "staff") as Role) === "owner" ? "owner" : "staff";

  if (!email || password.length < 6) {
    return { error: "Email wajib & kata sandi minimal 6 karakter." };
  }

  let created;
  try {
    created = await adminFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email },
      }),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal membuat akun." };
  }

  // Trigger membuat profile (role default 'staff'); set sesuai pilihan.
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .upsert({ id: created.id, full_name: fullName || email, role, is_active: true });

  revalidatePath("/pengguna");
  redirect("/pengguna?toast=" + encodeURIComponent("Akun pengguna dibuat"));
}

export async function toggleUserActiveAction(formData: FormData) {
  const me = await requireMaster();
  const id = String(formData.get("id") ?? "");
  const activate = String(formData.get("activate") ?? "") === "1";
  if (!id) return;
  if (id === me.id) {
    redirect(
      "/pengguna?toast=" +
        encodeURIComponent("Tidak bisa menonaktifkan akun sendiri") +
        "&toastType=error",
    );
  }

  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: activate }).eq("id", id);
  // Blokir/izinkan login lewat ban di Auth.
  try {
    await adminFetch(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ban_duration: activate ? "none" : "876000h" }),
    });
  } catch {
    /* profiles.is_active tetap jadi acuan getCurrentUser */
  }

  revalidatePath("/pengguna");
  redirect(
    "/pengguna?toast=" +
      encodeURIComponent(activate ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan"),
  );
}
