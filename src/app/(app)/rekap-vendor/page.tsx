import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SharePrintButton } from "@/components/share-print-button";
import { formatRupiah, formatNumber, formatTanggal, todayISO } from "@/lib/utils";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@page { size: A4 landscape; margin: 10mm; }
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
}
`;

type ItemRow = {
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  vendor_qty: number | null;
  susut: number | null;
  price_pending: boolean;
};

type DayGroup = {
  date: string;
  items: ItemRow[];
  dayTotal: number;
  dayPaid: number;
};

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function RekapVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("contacts")
    .select("id, name, city")
    .eq("is_active", true)
    .in("type", ["supplier", "both"])
    .order("name");

  const contactId = sp.contact || "";
  const from = sp.from || daysAgoISO(29);
  const to = sp.to || todayISO();

  let contact: Contact | null = null;
  let days: DayGroup[] = [];
  let grandTotal = 0;
  let payments: {
    id: string;
    date: string;
    amount: number;
    method: string | null;
    notes: string | null;
    proof_url: string | null;
  }[] = [];

  if (contactId) {
    const { data: c } = await supabase.from("contacts").select("*").eq("id", contactId).single();
    contact = c as Contact | null;

    const { data: purchases } = await supabase
      .from("purchases")
      .select("id, number, date, total, paid_total, status")
      .eq("contact_id", contactId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    const purchaseIds = (purchases ?? []).map((p) => p.id);

    const { data: items } = purchaseIds.length
      ? await supabase
          .from("purchase_items")
          .select("purchase_id, description, qty, unit_price, line_total, vendor_qty, susut, price_pending")
          .in("purchase_id", purchaseIds)
          .order("purchase_id", { ascending: true })
          .order("position", { ascending: true })
      : { data: [] as never[] };

    const purchaseById = new Map((purchases ?? []).map((p) => [p.id, p]));
    const byDate = new Map<string, DayGroup>();
    for (const p of purchases ?? []) {
      byDate.set(p.date, byDate.get(p.date) ?? { date: p.date, items: [], dayTotal: 0, dayPaid: 0 });
    }
    for (const it of items ?? []) {
      const p = purchaseById.get(it.purchase_id);
      if (!p) continue;
      const g = byDate.get(p.date)!;
      g.items.push({
        description: it.description,
        qty: Number(it.qty),
        unit_price: Number(it.unit_price),
        line_total: Number(it.line_total),
        vendor_qty: it.vendor_qty == null ? null : Number(it.vendor_qty),
        susut: it.susut == null ? null : Number(it.susut),
        price_pending: !!it.price_pending,
      });
    }
    for (const p of purchases ?? []) {
      const g = byDate.get(p.date)!;
      g.dayTotal += Number(p.total);
      g.dayPaid += Number(p.paid_total);
    }
    days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    grandTotal = days.reduce((s, d) => s + d.dayTotal, 0);

    const { data: payRows } = purchaseIds.length
      ? await supabase
          .from("payments")
          .select("id, date, amount, method, notes, proof_url")
          .in("purchase_id", purchaseIds)
          .order("date", { ascending: true })
      : { data: [] as never[] };
    payments = payRows ?? [];
  }

  const totalDibayar = payments.reduce((s, p) => s + Number(p.amount), 0);
  const sisa = grandTotal - totalDibayar;

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <PageHeader
          title="Rekap Vendor"
          subtitle="Buku besar pembelian per supplier — bisa dicetak/simpan sebagai PDF untuk dibagikan."
        />

        <Card className="mb-4">
          <CardContent className="pt-5">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground" htmlFor="contact">
                  Supplier
                </label>
                <Select id="contact" name="contact" defaultValue={contactId} className="min-w-[14rem]">
                  <option value="">— Pilih supplier —</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` — ${s.city}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground" htmlFor="from">
                  Dari
                </label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={from}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground" htmlFor="to">
                  Sampai
                </label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={to}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Tampilkan
              </button>
            </form>
            {contactId && (
              <div className="mt-3">
                <SharePrintButton />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!contactId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Pilih supplier untuk melihat rekap.
        </p>
      ) : (
        <div className="print-area rounded-lg bg-white p-6 text-slate-800">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Rekap Pembelian — {contact?.name ?? "-"}</h2>
              <p className="text-sm text-slate-500">
                {formatTanggal(from)} — {formatTanggal(to)}
                {contact?.phone ? ` · Telp: ${contact.phone}` : ""}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="p-1">No</th>
                <th className="p-1">Tanggal</th>
                <th className="p-1">Barang</th>
                <th className="p-1 text-right">Qty</th>
                <th className="p-1 text-right">Harga</th>
                <th className="p-1 text-right">Jumlah</th>
                <th className="p-1 text-right">Qty Nota Vendor</th>
                <th className="p-1 text-right">Susut</th>
                <th className="p-1 text-right">Jumlah/Hari</th>
                <th className="p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada pembelian pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                days.map((d, di) => (
                  <Fragment key={d.date}>
                    {d.items.map((it, i) => (
                      <tr key={`${d.date}-${i}`} className="border-b border-slate-100">
                        {i === 0 && (
                          <>
                            <td className="p-1 align-top" rowSpan={d.items.length}>
                              {di + 1}
                            </td>
                            <td className="p-1 align-top" rowSpan={d.items.length}>
                              {formatTanggal(d.date)}
                            </td>
                          </>
                        )}
                        <td className="p-1">
                          {it.description}
                          {it.price_pending ? " (menyusul)" : ""}
                        </td>
                        <td className="p-1 text-right">{formatNumber(it.qty)}</td>
                        <td className="p-1 text-right">
                          {it.price_pending ? "—" : formatNumber(it.unit_price)}
                        </td>
                        <td className="p-1 text-right">
                          {it.price_pending ? "—" : formatNumber(it.line_total)}
                        </td>
                        <td className="p-1 text-right">
                          {it.vendor_qty == null ? "—" : formatNumber(it.vendor_qty)}
                        </td>
                        <td
                          className={`p-1 text-right ${
                            it.susut != null && it.susut < 0 ? "text-red-600 font-semibold" : ""
                          }`}
                        >
                          {it.susut == null ? "—" : formatNumber(it.susut)}
                        </td>
                        {i === 0 && (
                          <td className="p-1 text-right align-top font-semibold" rowSpan={d.items.length}>
                            {formatRupiah(d.dayTotal)}
                          </td>
                        )}
                        {i === 0 && (
                          <td className="p-1 align-top" rowSpan={d.items.length}>
                            <span
                              className={
                                d.dayPaid >= d.dayTotal
                                  ? "text-emerald-600 font-semibold"
                                  : d.dayPaid > 0
                                    ? "text-amber-600 font-semibold"
                                    : "text-red-600 font-semibold"
                              }
                            >
                              {d.dayPaid >= d.dayTotal ? "LUNAS" : d.dayPaid > 0 ? "SEBAGIAN" : "HUTANG"}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              {payments.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-bold">Riwayat Pembayaran</h3>
                  <div className="flex flex-col gap-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        {p.proof_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.proof_url}
                            alt="Bukti transfer"
                            className="h-14 w-14 rounded border border-slate-200 object-cover"
                          />
                        )}
                        <div>
                          <div className="font-semibold">{formatRupiah(p.amount)}</div>
                          <div className="text-slate-500">
                            {formatTanggal(p.date)}
                            {p.method ? ` · ${p.method}` : ""}
                            {p.notes ? ` · ${p.notes}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between border-t border-slate-300 pt-2 font-bold">
                <span>TOTAL</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Dibayar</span>
                <span>{formatRupiah(totalDibayar)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 font-bold">
                <span>{sisa <= 0 ? "LUNAS" : "SISA"}</span>
                <span className={sisa > 0 ? "text-red-600" : "text-emerald-600"}>
                  {formatRupiah(Math.max(0, sisa))}
                </span>
              </div>
            </div>
          </div>

          {contact && (
            <div className="no-print mt-6">
              <Link href={`/kontak/${contact.id}`} className="text-sm text-primary hover:underline">
                ← Kembali ke Kontak {contact.name}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
