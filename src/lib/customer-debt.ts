import type { SupabaseClient } from "@supabase/supabase-js";

export type PrevDebt = { id: string; number: string; date: string; sisa: number };

/**
 * Tunggakan pelanggan/supplier yang sama dari nota LAIN yang masih ada sisa,
 * dengan tanggal <= tanggal nota yang sedang dibuka (selain nota itu sendiri).
 * Dipakai untuk menampilkan "total hutang" di nota & struk.
 */
export async function getPreviousDebts(
  supabase: SupabaseClient,
  table: "sales" | "purchases",
  contactId: string | null,
  currentId: string,
  currentDate: string,
): Promise<{ list: PrevDebt[]; total: number }> {
  if (!contactId) return { list: [], total: 0 };

  const { data } = await supabase
    .from(table)
    .select("id, number, date, total, paid_total")
    .eq("contact_id", contactId)
    .neq("id", currentId)
    .lte("date", currentDate)
    .order("date", { ascending: true });

  const list: PrevDebt[] = (data ?? [])
    .map((o) => ({
      id: o.id as string,
      number: o.number as string,
      date: o.date as string,
      sisa: Number(o.total) - Number(o.paid_total),
    }))
    .filter((o) => o.sisa > 0);

  const total = list.reduce((a, o) => a + o.sisa, 0);
  return { list, total };
}
