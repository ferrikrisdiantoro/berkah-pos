import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah, formatNumber, formatTanggal, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ItemRow = {
  product_id: string | null;
  description: string;
  qty: number;
  line_total: number;
  price_pending: boolean;
  purchases: { date: string } | { date: string }[] | null;
};

type Recap = {
  key: string;
  name: string;
  qty: number;
  total: number;
  notas: Set<string>;
  hasPending: boolean;
};

export default async function RekapPembelianPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  // Default: hari ini. Bisa diubah ke rentang tanggal berapa pun.
  const today = todayISO();
  const from = sp.from || today;
  const to = sp.to || today;

  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_items")
    .select(
      "product_id, description, qty, line_total, price_pending, purchases!inner(date, id)",
    )
    .gte("purchases.date", from)
    .lte("purchases.date", to);

  const rows = (data ?? []) as unknown as (ItemRow & {
    purchases: { date: string; id: string };
  })[];

  // Kelompokkan per jenis barang (produk kalau ada; kalau manual, per nama).
  const map = new Map<string, Recap>();
  for (const r of rows) {
    const key = r.product_id ?? `manual:${r.description.trim().toLowerCase()}`;
    const g =
      map.get(key) ??
      { key, name: r.description.trim() || "(tanpa nama)", qty: 0, total: 0, notas: new Set<string>(), hasPending: false };
    g.qty += Number(r.qty) || 0;
    g.total += Number(r.line_total) || 0;
    if (r.purchases?.id) g.notas.add(r.purchases.id);
    if (r.price_pending) g.hasPending = true;
    map.set(key, g);
  }

  const recap = [...map.values()].sort((a, b) => b.qty - a.qty);
  const grandQty = recap.reduce((s, r) => s + r.qty, 0);
  const grandTotal = recap.reduce((s, r) => s + r.total, 0);
  const sameDay = from === to;

  return (
    <div>
      <PageHeader
        title="Rekap Pembelian per Jenis"
        subtitle="Total pembelian tiap jenis barang (mis. berapa kg Nila, Layur, dst)."
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
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
            {sameDay
              ? `Menampilkan pembelian tanggal ${formatTanggal(from)}.`
              : `Menampilkan pembelian ${formatTanggal(from)} — ${formatTanggal(to)}.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {recap.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada pembelian pada rentang tanggal ini.
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
                        <span className="ml-1 text-xs text-amber-600">
                          (ada harga menyusul)
                        </span>
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
