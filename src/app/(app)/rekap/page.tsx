import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah, formatNumber, formatTanggal, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Jenis = "jual" | "beli";

type Recap = {
  key: string;
  name: string;
  qty: number;
  total: number;
  notas: Set<string>;
  hasPending: boolean;
};

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; from?: string; to?: string; produk?: string }>;
}) {
  const sp = await searchParams;
  const jenis: Jenis = sp.jenis === "beli" ? "beli" : "jual";
  const today = todayISO();
  // Default 7 hari terakhir supaya "hari ini / kemarin / lusa" langsung kelihatan.
  const from = sp.from || daysAgoISO(6);
  const to = sp.to || today;
  const produk = (sp.produk || "").trim();

  const itemTable = jenis === "jual" ? "sale_items" : "purchase_items";
  const parentTable = jenis === "jual" ? "sales" : "purchases";

  const supabase = await createClient();
  const { data } = await supabase
    .from(itemTable)
    .select(
      `product_id, description, qty, line_total, price_pending, ${parentTable}!inner(date, id)`,
    )
    .gte(`${parentTable}.date`, from)
    .lte(`${parentTable}.date`, to);

  type Row = {
    product_id: string | null;
    description: string;
    qty: number;
    line_total: number;
    price_pending: boolean;
  } & Record<string, { date: string; id: string }>;

  let rows = (data ?? []) as unknown as Row[];

  // Filter satu produk (dari klik di dashboard).
  if (produk) {
    const s = produk.toLowerCase();
    rows = rows.filter((r) => (r.description ?? "").toLowerCase().includes(s));
  }

  const map = new Map<string, Recap>();
  for (const r of rows) {
    const parent = r[parentTable];
    const key = r.product_id ?? `manual:${(r.description ?? "").trim().toLowerCase()}`;
    const g =
      map.get(key) ??
      {
        key,
        name: (r.description ?? "").trim() || "(tanpa nama)",
        qty: 0,
        total: 0,
        notas: new Set<string>(),
        hasPending: false,
      };
    g.qty += Number(r.qty) || 0;
    g.total += Number(r.line_total) || 0;
    if (parent?.id) g.notas.add(parent.id);
    if (r.price_pending) g.hasPending = true;
    map.set(key, g);
  }

  const recap = [...map.values()].sort((a, b) => b.qty - a.qty);
  const grandQty = recap.reduce((s, r) => s + r.qty, 0);
  const grandTotal = recap.reduce((s, r) => s + r.total, 0);
  const sameDay = from === to;

  const label = jenis === "jual" ? "Penjualan" : "Pembelian";
  const qs = (o: Record<string, string>) => {
    const p = new URLSearchParams({ jenis, from, to, ...(produk ? { produk } : {}), ...o });
    return `/rekap?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title={`Rekap ${label} per Jenis`}
        subtitle="Total tiap jenis barang (mis. berapa kg Nila, Layur, Udang, dst)."
      />

      {/* Toggle Jual / Beli */}
      <div className="mb-4 inline-flex overflow-hidden rounded-md border border-border">
        <Link
          href={qs({ jenis: "jual" })}
          className={`px-4 py-2 text-sm font-medium ${
            jenis === "jual" ? "bg-primary text-primary-foreground" : "bg-background"
          }`}
        >
          Penjualan
        </Link>
        <Link
          href={qs({ jenis: "beli" })}
          className={`px-4 py-2 text-sm font-medium ${
            jenis === "beli" ? "bg-primary text-primary-foreground" : "bg-background"
          }`}
        >
          Pembelian
        </Link>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="jenis" value={jenis} />
            {produk && <input type="hidden" name="produk" value={produk} />}
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
          <p className="mt-3 text-xs text-muted-foreground">
            {produk && (
              <>
                Difilter produk: <b>{produk}</b>{" "}
                <Link
                  href={`/rekap?jenis=${jenis}&from=${from}&to=${to}`}
                  className="text-primary hover:underline"
                >
                  (hapus filter)
                </Link>{" "}
                ·{" "}
              </>
            )}
            {sameDay
              ? `Rekap ${label.toLowerCase()} tanggal ${formatTanggal(from)}.`
              : `Rekap ${label.toLowerCase()} ${formatTanggal(from)} — ${formatTanggal(to)}.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {recap.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada {label.toLowerCase()} pada rentang tanggal ini.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Jenis Barang</TH>
                  <TH className="text-right">Nota</TH>
                  <TH className="text-right">Total Qty</TH>
                  <TH className="text-right">Total Rp</TH>
                </TR>
              </THead>
              <TBody>
                {recap.map((r) => (
                  <TR key={r.key}>
                    <TD className="font-medium">
                      {r.name}
                      {r.hasPending && (
                        <span className="ml-1 text-xs text-amber-600">(ada harga menyusul)</span>
                      )}
                    </TD>
                    <TD className="text-right text-muted-foreground">{r.notas.size}</TD>
                    <TD className="text-right font-semibold">{formatNumber(r.qty)}</TD>
                    <TD className="text-right">{formatRupiah(r.total)}</TD>
                  </TR>
                ))}
                <TR>
                  <TD className="font-bold">TOTAL</TD>
                  <TD />
                  <TD className="text-right font-bold">{formatNumber(grandQty)}</TD>
                  <TD className="text-right font-bold">{formatRupiah(grandTotal)}</TD>
                </TR>
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
