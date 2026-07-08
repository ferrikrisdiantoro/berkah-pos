"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addCashEntryAction(formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "in") === "out" ? "out" : "in";
  const category = String(formData.get("category") ?? "").trim() || "Lain-lain";
  if (!amount || amount <= 0) {
    redirect("/kas?toast=" + encodeURIComponent("Nominal tidak valid") + "&toastType=error");
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
  redirect("/kas?toast=" + encodeURIComponent("Catatan kas tersimpan"));
}

// Hanya entri manual yang boleh dihapus (entri otomatis ikut transaksinya).
export async function deleteCashEntryAction(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("cash_ledger")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
    .eq("ref_type", "manual");
  revalidatePath("/kas");
}
