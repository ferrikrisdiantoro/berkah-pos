import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { RekapPdfButton, type RekapPdfData } from "@/components/rekap-pdf-button";
import { formatRupiah, formatNumber, formatTanggal, todayISO } from "@/lib/utils";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

type Jenis = "beli" | "jual";

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

function statusOf(dayPaid: number, dayTotal: number): "LUNAS" | "SEBAGIAN" | "HUTANG" {
  if (dayPaid >= dayTotal) return "LUNAS";
  if (dayPaid > 0) return "SEBAGIAN";
  return "HUTANG";
}

export default async function RekapVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; from?: string; to?: string; jenis?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const jenis: Jenis = sp.jenis === "jual" ? "jual" : "beli";
  const docTable = jenis === "beli" ? "purchases" : "sales";
  const itemTable = jenis === "beli" ? "purchase_items" : "sale_items";
  const docField = jenis === "beli" ? "purchase_id" : "sale_id";
  const contactTypes = jenis === "beli" ? ["supplier", "both"] : ["customer", "both"];
  const title = jenis === "beli" ? "Rekap Pembelian" : "Rekap Penjualan";

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, city")
    .eq("is_active", true)
    .in("type", contactTypes)
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

    const { data: docs } = await supabase
      .from(docTable)
      .select("id, number, date, total, paid_total, status")
      .eq("contact_id", contactId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    const docIds = (docs ?? []).map((d) => d.id);
    const parentKey = jenis === "beli" ? "purchase_id" : "sale_id";

    const itemCols =
      jenis === "beli"
        ? `${parentKey}, description, qty, unit_price, line_total, vendor_qty, susut, price_pending`
        : `${parentKey}, description, qty, unit_price, line_total, price_pending`;

    const { data: items } = docIds.length
      ? await supabase
          .from(itemTable)
          .select(itemCols)
          .in(parentKey, docIds)
          .order(parentKey, { ascending: true })
          .order("position", { ascending: true })
      : { data: [] as never[] };

    const docById = new Map((docs ?? []).map((d) => [d.id, d]));
    const byDate = new Map<string, DayGroup>();
    for (const d of docs ?? []) {
      byDate.set(d.date, byDate.get(d.date) ?? { date: d.date, items: [], dayTotal: 0, dayPaid: 0 });
    }
    for (const it of (items ?? []) as unknown as Record<string, unknown>[]) {
      const parentId = it[parentKey] as string;
      const d = docById.get(parentId);
      if (!d) continue;
      const g = byDate.get(d.date)!;
      g.items.push({
        description: String(it.description ?? ""),
        qty: Number(it.qty),
        unit_price: Number(it.unit_price),
        line_total: Number(it.line_total),
        vendor_qty: it.vendor_qty == null ? null : Number(it.vendor_qty),
        susut: it.susut == null ? null : Number(it.susut),
        price_pending: !!it.price_pending,
      });
    }
    for (const d of docs ?? []) {
      const g = byDate.get(d.date)!;
      g.dayTotal += Number(d.total);
      g.dayPaid += Number(d.paid_total);
    }
    days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    grandTotal = days.reduce((s, d) => s + d.dayTotal, 0);

    const { data: payRows } = docIds.length
      ? await supabase
          .from("payments")
          .select("id, date, amount, method, notes, proof_url")
          .in(docField, docIds)
          .order("date", { ascending: true })
      : { data: [] as never[] };
    payments = payRows ?? [];
  }

  const totalDibayar = payments.reduce((s, p) => s + Number(p.amount), 0);
  const sisa = grandTotal - totalDibayar;
  const showVendorQty = jenis === "beli";

  const pdfData: RekapPdfData = {
    title,
    contactName: contact?.name ?? "-",
    contactPhone: contact?.phone ?? null,
    from,
    to,
    showVendorQty,
    // PDF tak punya rowSpan seperti tabel di layar — No/Total/Status diulang
    // di tiap baris item (bukan dikosongkan) supaya tak terbaca sebagai 0.
    rows: days.flatMap((d, di) =>
      d.items.map((it) => ({
        no: di + 1,
        date: d.date,
        description: it.description,
        qty: it.qty,
        unitPrice: it.unit_price,
        lineTotal: it.line_total,
        vendorQty: it.vendor_qty,
        susut: it.susut,
        pending: it.price_pending,
        dayTotal: d.dayTotal,
        status: statusOf(d.dayPaid, d.dayTotal),
      })),
    ),
    payments: payments.map((p) => ({
      date: p.date,
      amount: Number(p.amount),
      method: p.method,
      notes: p.notes,
      proofUrl: p.proof_url,
    })),
    grandTotal,
    totalDibayar,
    sisa,
  };

  return (
    <div>
      <PageHeader
        title={jenis === "beli" ? "Rekap Vendor" : "Rekap Pelanggan"}
        subtitle="Buku besar transaksi per kontak — bisa diunduh/dibagikan sebagai PDF."
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <div className="mb-3 inline-flex overflow-hidden rounded-md border border-border">
            <Link
              href={`/rekap-vendor?jenis=beli${contactId && jenis === "beli" ? `&contact=${contactId}` : ""}&from=${from}&to=${to}`}
              className={`px-4 py-2 text-sm font-medium ${
                jenis === "beli" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              Pembelian (Supplier)
            </Link>
            <Link
              href={`/rekap-vendor?jenis=jual${contactId && jenis === "jual" ? `&contact=${contactId}` : ""}&from=${from}&to=${to}`}
              className={`px-4 py-2 text-sm font-medium ${
                jenis === "jual" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              Penjualan (Pelanggan)
            </Link>
          </div>

          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="jenis" value={jenis} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground" htmlFor="contact">
                {jenis === "beli" ? "Supplier" : "Pelanggan"}
              </label>
              <Select id="contact" name="contact" defaultValue={contactId} className="min-w-[14rem]">
                <option value="">— Pilih {jenis === "beli" ? "supplier" : "pelanggan"} —</option>
                {(contacts ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` — ${c.city}` : ""}
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
              <RekapPdfButton data={pdfData} />
            </div>
          )}
        </CardContent>
      </Card>

      {!contactId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Pilih {jenis === "beli" ? "supplier" : "pelanggan"} untuk melihat rekap.
        </p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold">
                {title} — {contact?.name ?? "-"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatTanggal(from)} — {formatTanggal(to)}
                {contact?.phone ? ` · Telp: ${contact.phone}` : ""}
              </p>
            </div>

            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="p-1">No</th>
                  <th className="p-1">Tanggal</th>
                  <th className="p-1">Barang</th>
                  <th className="p-1 text-right">Qty</th>
                  <th className="p-1 text-right">Harga</th>
                  <th className="p-1 text-right">Jumlah</th>
                  {showVendorQty && (
                    <>
                      <th className="p-1 text-right">Qty Nota Vendor</th>
                      <th className="p-1 text-right">Susut</th>
                    </>
                  )}
                  <th className="p-1 text-right">Jumlah/Hari</th>
                  <th className="p-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {days.length === 0 ? (
                  <tr>
                    <td colSpan={showVendorQty ? 10 : 8} className="py-8 text-center text-muted-foreground">
                      Tidak ada transaksi pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  days.map((d, di) => (
                    <Fragment key={d.date}>
                      {d.items.map((it, i) => (
                        <tr key={`${d.date}-${i}`} className="border-b border-border/60">
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
                          {showVendorQty && (
                            <>
                              <td className="p-1 text-right">
                                {it.vendor_qty == null ? "—" : formatNumber(it.vendor_qty)}
                              </td>
                              <td
                                className={`p-1 text-right ${
                                  it.susut != null && it.susut < 0 ? "font-semibold text-destructive" : ""
                                }`}
                              >
                                {it.susut == null ? "—" : formatNumber(it.susut)}
                              </td>
                            </>
                          )}
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
                                    ? "font-semibold text-success"
                                    : d.dayPaid > 0
                                      ? "font-semibold text-warning"
                                      : "font-semibold text-destructive"
                                }
                              >
                                {statusOf(d.dayPaid, d.dayTotal)}
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

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
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
                              className="h-14 w-14 rounded border border-border object-cover"
                            />
                          )}
                          <div>
                            <div className="font-semibold">{formatRupiah(p.amount)}</div>
                            <div className="text-muted-foreground">
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
              <div className="sm:ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>TOTAL</span>
                  <span>{formatRupiah(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Dibayar</span>
                  <span>{formatRupiah(totalDibayar)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>{sisa <= 0 ? "LUNAS" : "SISA"}</span>
                  <span className={sisa > 0 ? "text-destructive" : "text-success"}>
                    {formatRupiah(Math.max(0, sisa))}
                  </span>
                </div>
              </div>
            </div>

            {contact && (
              <div className="mt-6">
                <Link href={`/kontak/${contact.id}`} className="text-sm text-primary hover:underline">
                  ← Kembali ke Kontak {contact.name}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
