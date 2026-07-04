import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "staff";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
}

/** User + peran yang sedang login (null bila belum login). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as Role) ?? "staff",
    fullName: profile?.full_name ?? null,
  };
}

/** Guard halaman/aksi khusus Master (owner). Staf diarahkan ke dashboard. */
export async function requireMaster(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "owner") {
    redirect(
      "/?toast=" +
        encodeURIComponent("Halaman ini khusus Master") +
        "&toastType=error",
    );
  }
  return user;
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Master",
  staff: "Staf",
};
