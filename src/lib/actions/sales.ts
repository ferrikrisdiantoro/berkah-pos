"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ItemInput = {
  product_id: string | null;
  consignment_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
};

function parseItems(raw: string): ItemInput[] {
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        product_id: (o.product_id as string) || null,
        consignment_id: (o.consignment_id as string) || null,
        description: String(o.description ?? "").trim(),
        qty: Number(o.qty) || 0,
        unit_price: Number(o.unit_price) || 0,
        discount_pct: Math.min(100, Math.max(0, Number(o.discount_pct) || 0)),
        tax_pct: Math.min(100, Math.max(0, Number(o.tax_pct) || 0)),
      };
    })
    .filter((i) => i.description && i.qty > 0);
}

export async function saveSaleAction(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "") || null;
  const date = String(formData.get("date") ?? "") || undefined;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "unpaid");
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (items.length === 0) return { error: "Tambahkan minimal satu item." };
  if (!contactId) return { error: "Pilih pelanggan." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let saleId = id;

  if (id) {
    const { error } = await supabase
      .from("sales")
      .update({ contact_id: contactId, date, due_date: dueDate, notes, status })
      .eq("id", id);
    if (error) return { error: error.message };
    await supabase.from("sale_items").delete().eq("sale_id", id);
  } else {
    const { data: number, error: numErr } = await supabase.rpc("next_doc_number", {
      p_doc_type: "sale",
    });
    if (numErr) return { error: numErr.message };

    const { data: created, error } = await supabase
      .from("sales")
      .insert({
        number: number as string,
        contact_id: contactId,
        date,
        due_date: dueDate,
        notes,
        status,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Gagal membuat nota." };
    saleId = created.id;
  }

  const rows = items.map((it, idx) => ({
    sale_id: saleId,
    product_id: it.product_id,
    consignment_id: it.consignment_id,
    description: it.description,
    qty: it.qty,
    unit_price: it.unit_price,
    discount_pct: it.discount_pct,
    tax_pct: it.tax_pct,
    position: idx,
  }));
  const { error: itemsErr } = await supabase.from("sale_items").insert(rows);
  if (itemsErr) {
    // Nota baru gagal diisi item -> buang header agar tak jadi nota hantu.
    if (!id) await supabase.from("sales").delete().eq("id", saleId);
    return { error: itemsErr.message };
  }

  revalidatePath("/penjualan");
  redirect(`/penjualan/${saleId}?toast=` + encodeURIComponent("Nota penjualan tersimpan"));
}

export async function deleteSaleAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("sales").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/penjualan");
}

export async function addSalePaymentAction(formData: FormData) {
  const supabase = await createClient();
  const saleId = String(formData.get("sale_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!saleId || !amount || amount <= 0) return { error: "Nominal tidak valid." };

  // Item yang dipilih untuk dibayar duluan (boleh kosong = pembayaran umum/DP).
  const itemIds = formData.getAll("item_ids").map(String).filter(Boolean);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      kind: "sale",
      sale_id: saleId,
      account_id: String(formData.get("account_id") ?? "") || null,
      date: String(formData.get("date") ?? "") || undefined,
      amount,
      method: String(formData.get("method") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !payment) return { error: error?.message ?? "Gagal mencatat pembayaran." };

  if (itemIds.length > 0) {
    // Sisa per item = line_total - yang sudah dialokasikan.
    const [{ data: items }, { data: allocs }] = await Promise.all([
      supabase.from("sale_items").select("id, line_total").in("id", itemIds),
      supabase.from("payment_allocations").select("sale_item_id, amount").in("sale_item_id", itemIds),
    ]);

    const paidBy = new Map<string, number>();
    for (const a of allocs ?? []) {
      paidBy.set(a.sale_item_id, (paidBy.get(a.sale_item_id) ?? 0) + Number(a.amount));
    }

    // Bagikan nominal ke item sesuai urutan pilihan sampai habis (mendukung DP).
    let left = amount;
    const rows: { payment_id: string; sale_item_id: string; amount: number }[] = [];
    for (const id of itemIds) {
      if (left <= 0) break;
      const item = (items ?? []).find((x) => x.id === id);
      if (!item) continue;
      const outstanding = Number(item.line_total) - (paidBy.get(id) ?? 0);
      if (outstanding <= 0) continue;
      const alloc = Math.min(left, outstanding);
      rows.push({ payment_id: payment.id, sale_item_id: id, amount: alloc });
      left -= alloc;
    }
    if (rows.length > 0) await supabase.from("payment_allocations").insert(rows);
  }

  revalidatePath(`/penjualan/${saleId}`);
  return { ok: true };
}

export async function deleteSalePaymentAction(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const saleId = String(formData.get("sale_id") ?? "");
  await supabase.from("payments").delete().eq("id", id);
  revalidatePath(`/penjualan/${saleId}`);
}
