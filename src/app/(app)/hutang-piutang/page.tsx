import { requireMaster } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  total: number;
  paid_total: number;
  status: string;
  contact: { name: string } | { name: string }[] | null;
};

function groupOutstanding(rows: Row[]) {
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

export default async function HutangPiutangPage() {
  await requireMaster();
  const supabase = await createClient();
  const [{ data: purchases }, { data: sales }, { data: ownerItems }, { data: ownerPays }, { data: contacts }] =
    await Promise.all([
      supabase.from("purchases").select("total, paid_total, status, contact:contacts(name)"),
      supabase.from("sales").select("total, paid_total, status, contact:contacts(name)"),
      supabase.from("sale_items").select("owner_id, owner_amount").not("owner_id", "is", null),
      supabase.from("owner_payments").select("owner_id, amount"),
      supabase.from("contacts").select("id, name"),
    ]);

  const hutang = groupOutstanding((purchases ?? []) as Row[]);
  const piutang = groupOutstanding((sales ?? []) as Row[]);

  // Hak pemilik barang titipan yang belum dibayar = HUTANG toko juga.
  const nameById = new Map<string, string>();
  for (const c of contacts ?? []) nameById.set(c.id, c.name);
  const accrued = new Map<string, number>();
  for (const it of ownerItems ?? []) {
    if (!it.owner_id) continue;
    accrued.set(it.owner_id, (accrued.get(it.owner_id) ?? 0) + Number(it.owner_amount));
  }
  for (const p of ownerPays ?? []) {
    if (!p.owner_id) continue;
    accrued.set(p.owner_id, (accrued.get(p.owner_id) ?? 0) - Number(p.amount));
  }
  const hakPemilik = [...accrued.entries()]
    .filter(([, v]) => v > 0)
    .map(([id, v]) => [nameById.get(id) ?? "—", v] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const totalHutangNota = hutang.reduce((s, [, v]) => s + v, 0);
  const totalHakPemilik = hakPemilik.reduce((s, [, v]) => s + v, 0);
  const totalHutang = totalHutangNota + totalHakPemilik;
  const totalPiutang = piutang.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Hutang & Piutang" subtitle="Sisa tagihan ke supplier & dari pelanggan." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Hutang</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{formatRupiah(totalHutang)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nota beli {formatRupiah(totalHutangNota)} + hak pemilik titipan{" "}
              {formatRupiah(totalHakPemilik)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Piutang (dari pelanggan)</p>
            <p className="mt-1 text-2xl font-bold text-success">{formatRupiah(totalPiutang)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OutstandingTable title="Hutang per Supplier (nota beli)" rows={hutang} label="Supplier" />
        <OutstandingTable title="Piutang per Pelanggan" rows={piutang} label="Pelanggan" />
      </div>

      <div className="mt-4">
        <OutstandingTable
          title="Hutang Hak Pemilik Barang Titipan (belum dibayar)"
          rows={hakPemilik}
          label="Pemilik Barang"
        />
      </div>
    </div>
  );
}

function OutstandingTable({ title, rows, label }: { title: string; rows: [string, number][]; label: string }) {
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
