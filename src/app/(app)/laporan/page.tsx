import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DocRow = {
  total: number;
  paid_total: number;
  status: string;
  contact: { name: string } | { name: string }[] | null;
};

function groupOutstanding(rows: DocRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "paid" || r.status === "draft") continue;
    const c = r.contact;
    const name = (Array.isArray(c) ? c[0]?.name : c?.name) ?? "—";
    const sisa = Number(r.total) - Number(r.paid_total);
    if (sisa <= 0) continue;
    map.set(name, (map.get(name) ?? 0) + sisa);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function LaporanPage() {
  await requireMaster();
  const supabase = await createClient();
  const [{ data: purchases }, { data: sales }, { data: products }, { data: consignItems }] =
    await Promise.all([
      supabase.from("purchases").select("total, paid_total, status, contact:contacts(name)"),
      supabase.from("sales").select("total, paid_total, status, contact:contacts(name)"),
      supabase
        .from("products")
        .select("name, stock, buy_price, track_stock, unit:units(name)")
        .eq("is_active", true),
      supabase
        .from("sale_items")
        .select("commission_amount, owner_amount")
        .not("consignment_id", "is", null),
    ]);

  const komisiToko = (consignItems ?? []).reduce(
    (s, i) => s + Number(i.commission_amount),
    0,
  );

  const hutang = groupOutstanding((purchases ?? []) as DocRow[]);
  const piutang = groupOutstanding((sales ?? []) as DocRow[]);
  const stok = ((products ?? []) as {
    name: string;
    stock: number;
    buy_price: number;
    track_stock: boolean;
    unit: { name: string } | { name: string }[] | null;
  }[]).filter((p) => p.track_stock);

  const totalHutang = hutang.reduce((s, [, v]) => s + v, 0);
  const totalPiutang = piutang.reduce((s, [, v]) => s + v, 0);
  const nilaiStok = stok.reduce((s, p) => s + Number(p.stock) * Number(p.buy_price), 0);

  return (
    <div>
      <PageHeader title="Laporan" subtitle="Hutang, piutang, dan nilai stok." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Hutang" value={formatRupiah(totalHutang)} tone="text-destructive" />
        <SummaryCard label="Total Piutang" value={formatRupiah(totalPiutang)} tone="text-success" />
        <SummaryCard label="Komisi Toko (Titipan)" value={formatRupiah(komisiToko)} tone="text-primary" />
        <SummaryCard label="Nilai Stok" value={formatRupiah(nilaiStok)} tone="text-primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OutstandingTable title="Hutang per Supplier" rows={hutang} label="Supplier" />
        <OutstandingTable title="Piutang per Pelanggan" rows={piutang} label="Pelanggan" />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nilai Persediaan</CardTitle>
        </CardHeader>
        <CardContent>
          {stok.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada produk berstok.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Produk</TH>
                  <TH className="text-right">Stok</TH>
                  <TH className="text-right">Harga Beli</TH>
                  <TH className="text-right">Nilai</TH>
                </TR>
              </THead>
              <TBody>
                {stok.map((p, i) => {
                  const unit = Array.isArray(p.unit) ? p.unit[0]?.name : p.unit?.name;
                  return (
                    <TR key={i}>
                      <TD className="font-medium">{p.name}</TD>
                      <TD className="text-right">
                        {formatNumber(p.stock)} {unit ?? ""}
                      </TD>
                      <TD className="text-right">{formatRupiah(p.buy_price)}</TD>
                      <TD className="text-right">
                        {formatRupiah(Number(p.stock) * Number(p.buy_price))}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function OutstandingTable({
  title,
  rows,
  label,
}: {
  title: string;
  rows: [string, number][];
  label: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{label}</TH>
                <TH className="text-right">Sisa</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(([name, val]) => (
                <TR key={name}>
                  <TD className="font-medium">{name}</TD>
                  <TD className="text-right">{formatRupiah(val)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
