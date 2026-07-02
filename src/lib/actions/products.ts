"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Ubah pesan error DB jadi bahasa yang ramah. */
function humanize(message?: string): string {
  const m = message ?? "";
  if (/duplicate key|already exists/i.test(m)) return "Kode produk sudah dipakai produk lain.";
  return m || "Gagal menyimpan. Coba lagi.";
}

/** Cari unit berdasarkan nama, buat jika belum ada. Kembalikan id. */
async function ensureUnit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: found } = await supabase
    .from("units")
    .select("id")
    .ilike("name", clean)
    .maybeSingle();
  if (found) return found.id;
  const { data: created } = await supabase
    .from("units")
    .insert({ name: clean })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function saveProductAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama produk wajib diisi." };

  const unitId = await ensureUnit(supabase, String(formData.get("unit") ?? ""));

  const payload = {
    name,
    code: String(formData.get("code") ?? "").trim() || null,
    unit_id: unitId,
    buy_price: Number(formData.get("buy_price") ?? 0) || 0,
    sell_price: Number(formData.get("sell_price") ?? 0) || 0,
    track_stock: formData.get("track_stock") === "on",
    min_stock: Number(formData.get("min_stock") ?? 0) || 0,
  };

  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return { error: humanize(error.message) };
  } else {
    // Stok awal masuk lewat stock_movements (ref_kind 'opening'); trigger yang
    // menyetel products.stock — jangan set kolom stok langsung agar tak dobel.
    const openingStock = Number(formData.get("stock") ?? 0) || 0;
    const { data: created, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error || !created) return { error: humanize(error?.message) };
    if (openingStock !== 0 && payload.track_stock) {
      await supabase.from("stock_movements").insert({
        product_id: created.id,
        qty: openingStock,
        ref_kind: "opening",
        note: "Stok awal",
      });
    }
  }
  revalidatePath("/produk");
  redirect("/produk?toast=" + encodeURIComponent("Produk berhasil disimpan"));
}

/** Penyesuaian stok (opname): set stok aktual hasil hitung fisik. */
export async function adjustStockAction(formData: FormData) {
  const supabase = await createClient();
  const productId = String(formData.get("product_id") ?? "");
  const actualRaw = String(formData.get("actual") ?? "");
  const actual = Number(actualRaw);
  if (!productId || actualRaw === "" || !Number.isFinite(actual) || actual < 0) {
    return { error: "Nilai stok tidak valid." };
  }
  const { error } = await supabase.rpc("adjust_stock", {
    p_product: productId,
    p_actual: actual,
    p_note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/produk/${productId}`);
  revalidatePath("/produk");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/produk");
}
