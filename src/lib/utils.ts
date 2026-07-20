import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bersihkan kata kunci pencarian sebelum dipakai di filter PostgREST `.or()`.
 * Karakter , ( ) " \ merusak sintaks logic-tree (mis. cari "nila,udang" -> HTTP 400),
 * sedangkan % dan _ adalah wildcard ilike yang bisa bikin hasil ngawur.
 */
export function sanitizeSearch(q: string | undefined | null): string {
  if (!q) return "";
  return q
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Format angka ke Rupiah, mis. 1365000 -> "Rp 1.365.000" */
export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "Rp 0";
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
}

/** Format angka biasa dengan pemisah ribuan (untuk kuantitas). */
export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(n);
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Format tanggal ISO (yyyy-mm-dd) -> "16 Juni 2026" */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal ISO -> "20/07/2026" (dipakai di struk/nota). */
export function formatTanggalPendek(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** yyyy-mm-dd hari ini (zona lokal) untuk default input date. */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
