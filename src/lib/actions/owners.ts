"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function recordOwnerPaymentAction(formData: FormData) {
  const supabase = await createClient();
  const ownerId = String(formData.get("owner_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!ownerId || !amount || amount <= 0) {
    redirect(
      "/hak-pemilik?toast=" +
        encodeURIComponent("Nominal tidak valid") +
        "&toastType=error",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("owner_payments").insert({
    owner_id: ownerId,
    amount,
    date: String(formData.get("date") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/hak-pemilik");
  redirect("/hak-pemilik?toast=" + encodeURIComponent("Pembayaran ke pemilik dicatat"));
}
