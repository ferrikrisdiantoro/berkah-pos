"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

const toastUrl = (msg: string) =>
  "/pengaturan?toast=" + encodeURIComponent(msg);

export async function updateBusinessAction(formData: FormData): Promise<void> {
  await requireMaster(); // halaman sudah dijaga, tapi action harus dijaga sendiri
  const supabase = await createClient();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  await supabase
    .from("business_settings")
    .update({
      name: String(formData.get("name") ?? "").trim() || "WL Pemburu Bandeng",
      // Gambar nota: data URI hasil upload, path statis, atau kosong (dihapus).
      logo_url: logoUrl || null,
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      footer_note: String(formData.get("footer_note") ?? "").trim() || null,
      // Teks nota yang bisa diatur sendiri (#6)
      bank_info: String(formData.get("bank_info") ?? "").trim() || null,
      receipt_title_sale:
        String(formData.get("receipt_title_sale") ?? "").trim() || "NOTA PENJUALAN",
      receipt_title_purchase:
        String(formData.get("receipt_title_purchase") ?? "").trim() || "NOTA PEMBELIAN",
      signature_note: String(formData.get("signature_note") ?? "").trim() || null,
    })
    .eq("id", 1);

  revalidatePath("/pengaturan");
  redirect(toastUrl("Data usaha tersimpan"));
}

export async function addBankAccountAction(formData: FormData): Promise<void> {
  await requireMaster();
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
  redirect(toastUrl("Rekening ditambahkan"));
}

export async function deleteBankAccountAction(formData: FormData) {
  await requireMaster();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("bank_accounts").update({ is_active: false }).eq("id", id);
  revalidatePath("/pengaturan");
}
