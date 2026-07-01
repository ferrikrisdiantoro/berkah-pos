"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateBusinessAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("business_settings")
    .update({
      name: String(formData.get("name") ?? "").trim() || "UD. Berkah Mina",
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      footer_note: String(formData.get("footer_note") ?? "").trim() || null,
    })
    .eq("id", 1);

  revalidatePath("/pengaturan");
}

export async function addBankAccountAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("bank_accounts").insert({
    name,
    account_number: String(formData.get("account_number") ?? "").trim() || null,
    holder: String(formData.get("holder") ?? "").trim() || null,
    is_cash: formData.get("is_cash") === "on",
  });

  revalidatePath("/pengaturan");
}

export async function deleteBankAccountAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("bank_accounts").update({ is_active: false }).eq("id", id);
  revalidatePath("/pengaturan");
}
