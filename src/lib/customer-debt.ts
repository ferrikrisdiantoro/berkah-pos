import type { SupabaseClient } from "@supabase/supabase-js";

export type PrevDebt = { id: string; number: string; date: string; sisa: number };

/**
 * Tunggakan pelanggan/supplier yang sama dari nota LAIN yang masih ada sisa,
 * dengan tanggal <= tanggal nota yang sedang dibuka (selain nota itu sendiri).
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

/** Saldo tunggakan lama (manual, di luar nota sistem) yang tersimpan di kontak. */
export async function getContactManualDebt(
  supabase: SupabaseClient,
  contactId: string | null,
): Promise<number> {
  if (!contactId) return 0;
  const { data } = await supabase
    .from("contacts")
    .select("manual_debt_balance")
    .eq("id", contactId)
    .single();
  return Number(data?.manual_debt_balance ?? 0);
}

export type EffectiveDebt = {
  list: PrevDebt[];
  manualBalance: number;
  total: number;
  /** true bila nota ini pakai override manual per-nota (kolom sales.manual_previous_debt). */
  isOverride: boolean;
};

/**
 * Tunggakan sebelumnya yang dipakai di nota: bila nota punya override manual
 * (checkbox "isi tunggakan manual" per nota), pakai itu apa adanya. Selain
 * itu, otomatis: sisa nota lain yang belum lunas + saldo tunggakan lama
 * kontak (dicatat sekali di halaman Kontak, otomatis terbawa tiap nota baru
 * tanpa perlu diketik ulang).
 */
export async function getEffectivePreviousDebt(
  supabase: SupabaseClient,
  table: "sales" | "purchases",
  doc: { id: string; contact_id: string | null; date: string; manual_previous_debt?: number | null },
): Promise<EffectiveDebt> {
  if (doc.manual_previous_debt != null) {
    return { list: [], manualBalance: 0, total: Number(doc.manual_previous_debt), isOverride: true };
  }
  const [{ list, total: autoTotal }, manualBalance] = await Promise.all([
    getPreviousDebts(supabase, table, doc.contact_id, doc.id, doc.date),
    getContactManualDebt(supabase, doc.contact_id),
  ]);
  return { list, manualBalance, total: autoTotal + manualBalance, isOverride: false };
}
