"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveConsignmentAction(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
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

  const base = {
    owner_id: ownerId,
    product_id: String(formData.get("product_id") ?? "") || null,
    product_name: productName,
    unit: String(formData.get("unit") ?? "").trim() || null,
    // Harga titip boleh dikosongkan (belum tahu harga) -> 0.
    base_price: Number(formData.get("base_price") ?? 0) || 0,
    commission_type: commissionType === "fixed_per_unit" ? "fixed_per_unit" : "percent",
    commission_value: Math.max(0, commissionValue),
    received_date: String(formData.get("received_date") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (id) {
    // Ubah jumlah titip -> sisa ikut bergeser sebesar selisihnya (yang sudah
    // terjual tetap terhitung).
    const { data: cur } = await supabase
      .from("consignments")
      .select("qty_in, qty_remaining")
      .eq("id", id)
      .single();
    if (!cur) return { error: "Titipan tidak ditemukan." };

    // Hitung dari yang SUDAH TERJUAL, jangan menggeser delta lalu di-clamp ke 0
    // (dulu: qty_in 100 (60 terjual) diubah ke 10 -> sisa dipaksa 0, data rusak).
    const sold = Number(cur.qty_in) - Number(cur.qty_remaining);
    if (qtyIn < sold) {
      return {
        error: `Jumlah titip tidak boleh kurang dari yang sudah terjual (${sold}).`,
      };
    }
    const newRemaining = qtyIn - sold;

    const { error } = await supabase
      .from("consignments")
      .update({
        ...base,
        qty_in: qtyIn,
        qty_remaining: newRemaining,
        status: newRemaining <= 0 ? "closed" : "open",
      })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("consignments").insert({
      ...base,
      qty_in: qtyIn,
      qty_remaining: qtyIn,
      created_by: user?.id ?? null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/titipan");
  redirect("/titipan?toast=" + encodeURIComponent("Barang titipan tersimpan"));
}

export async function deleteConsignmentAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("consignments")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));

  if (error) {
    // FK restrict: titipan yang barangnya sudah terjual tidak boleh dihapus,
    // karena hak pemilik & riwayat penjualannya harus tetap utuh.
    revalidatePath("/titipan");
    redirect(
      "/titipan?toast=" +
        encodeURIComponent(
          "Titipan ini sudah ada penjualannya, tidak bisa dihapus. Kosongkan sisanya atau biarkan sebagai riwayat.",
        ) +
        "&toastType=error",
    );
  }
  revalidatePath("/titipan");
}
