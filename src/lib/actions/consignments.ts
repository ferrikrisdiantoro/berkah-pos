"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveConsignmentAction(formData: FormData) {
  const supabase = await createClient();

  const ownerId = String(formData.get("owner_id") ?? "");
  const productName = String(formData.get("product_name") ?? "").trim();
  const qtyIn = Number(formData.get("qty_in") ?? 0) || 0;
  const commissionType = String(formData.get("commission_type") ?? "percent");
  const commissionValue = Number(formData.get("commission_value") ?? 0) || 0;

  if (!ownerId) return { error: "Pilih pemilik barang." };
  if (!productName) return { error: "Nama barang wajib diisi." };
  if (qtyIn <= 0) return { error: "Jumlah titipan harus lebih dari 0." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("consignments").insert({
    owner_id: ownerId,
    product_id: String(formData.get("product_id") ?? "") || null,
    product_name: productName,
    unit: String(formData.get("unit") ?? "").trim() || null,
    qty_in: qtyIn,
    qty_remaining: qtyIn,
    base_price: Number(formData.get("base_price") ?? 0) || 0,
    commission_type: commissionType === "fixed_per_unit" ? "fixed_per_unit" : "percent",
    commission_value: Math.max(0, commissionValue),
    received_date: String(formData.get("received_date") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/titipan");
  redirect("/titipan?toast=" + encodeURIComponent("Barang titipan tersimpan"));
}

export async function deleteConsignmentAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("consignments").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/titipan");
}
