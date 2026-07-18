import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import type { ConsignmentOption } from "@/components/invoice-editor";

/** Opsi barang titipan (yang masih ada sisa) untuk editor penjualan. */
export async function getConsignmentOptions(): Promise<ConsignmentOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consignments")
    .select("id, product_name, unit, qty_remaining, base_price, owner:contacts(name)")
    .eq("status", "open")
    .gt("qty_remaining", 0)
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => {
    const owner = c.owner as { name?: string } | { name?: string }[] | null;
    const ownerName = Array.isArray(owner) ? owner[0]?.name : owner?.name;
    return {
      id: c.id,
      label: `${ownerName ?? "?"} · ${c.product_name} — sisa ${formatNumber(c.qty_remaining)} ${c.unit ?? ""}`,
      desc: c.product_name,
      base_price: Number(c.base_price),
    };
  });
}
