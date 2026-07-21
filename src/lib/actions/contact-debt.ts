"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Catat mutasi tunggakan manual (lama, di luar nota sistem) untuk sebuah
 * kontak. amount positif = tambah tunggakan, negatif = pembayaran/pengurang.
 * Saldo ini otomatis dipakai sebagai "Tunggakan Sebelumnya" di nota
 * berikutnya kontak tsb — admin tak perlu ketik ulang tiap nota.
 */
export async function addDebtEntryAction(formData: FormData) {
  const supabase = await createClient();
  const contactId = String(formData.get("contact_id") ?? "");
  const kind = String(formData.get("kind") ?? "tambah"); // "tambah" | "bayar"
  const nominal = Math.abs(Number(formData.get("amount") ?? 0));
  const date = String(formData.get("date") ?? "") || undefined;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!contactId) return { error: "Kontak tidak valid." };
  if (!nominal || nominal <= 0) return { error: "Nominal harus lebih dari 0." };

  const amount = kind === "bayar" ? -nominal : nominal;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.rpc("adjust_contact_debt", {
    p_contact_id: contactId,
    p_amount: amount,
    p_date: date,
    p_note: note,
    p_user: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/kontak/${contactId}`);
  return { ok: true };
}

export async function deleteDebtEntryAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "");
  await supabase.rpc("delete_contact_debt_entry", { p_entry_id: id });
  revalidatePath(`/kontak/${contactId}`);
}
