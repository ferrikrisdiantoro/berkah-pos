"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContactType } from "@/lib/types";

function parseContact(formData: FormData) {
  return {
    type: (String(formData.get("type") ?? "supplier") as ContactType),
    category: String(formData.get("category") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function saveContactAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const data = parseContact(formData);
  if (!data.name) return { error: "Nama wajib diisi." };

  const { error } = id
    ? await supabase.from("contacts").update(data).eq("id", id)
    : await supabase.from("contacts").insert(data);
  if (error) return { error: error.message };

  revalidatePath("/kontak");
  redirect("/kontak?toast=" + encodeURIComponent("Kontak berhasil disimpan"));
}

export async function deleteContactAction(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("contacts")
    .update({ is_active: false })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/kontak");
}
