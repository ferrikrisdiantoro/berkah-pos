"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

export async function addCashEntryAction(formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "in") === "out" ? "out" : "in";
  const category = String(formData.get("category") ?? "").trim() || "Lain-lain";
  // Halaman asal — allowlist, jangan percaya input mentah (cegah open redirect).
  const back = String(formData.get("redirect_to") ?? "") === "/pengeluaran" ? "/pengeluaran" : "/kas";
  if (!amount || amount <= 0) {
    redirect(back + "?toast=" + encodeURIComponent("Nominal tidak valid") + "&toastType=error");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("cash_ledger").insert({
    entry_date: String(formData.get("entry_date") ?? "") || undefined,
    direction,
    category,
    description: String(formData.get("description") ?? "").trim() || null,
    amount,
    ref_type: "manual",
    created_by: user?.id ?? null,
  });

  revalidatePath("/kas");
  revalidatePath("/pengeluaran");
  redirect(back + "?toast=" + encodeURIComponent("Catatan tersimpan"));
}

// Hanya entri manual yang boleh dihapus (entri otomatis ikut transaksinya).
export async function deleteCashEntryAction(formData: FormData) {
  await requireMaster();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cash_ledger")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("ref_type", "manual");
  if (error) {
    redirect("/kas?toast=" + encodeURIComponent("Gagal menghapus: " + error.message) + "&toastType=error");
  }
  revalidatePath("/kas");
  revalidatePath("/pengeluaran");
}
