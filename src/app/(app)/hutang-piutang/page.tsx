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
  const [{ data: purchases }, { data: sales }] = await Promise.all([
    supabase.from("purchases").select("total, paid_total, status, contact:contacts(name)"),
    supabase.from("sales").select("total, paid_total, status, contact:contacts(name)"),
  ]);

  const hutang = groupOutstanding((purchases ?? []) as Row[]);
  const piutang = groupOutstanding((sales ?? []) as Row[]);
  const totalHutang = hutang.reduce((s, [, v]) => s + v, 0);
  const totalPiutang = piutang.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Hutang & Piutang" subtitle="Sisa tagihan ke supplier & dari pelanggan." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Hutang (ke supplier)</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{formatRupiah(totalHutang)}</p>
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
        <OutstandingTable title="Hutang per Supplier" rows={hutang} label="Supplier" />
        <OutstandingTable title="Piutang per Pelanggan" rows={piutang} label="Pelanggan" />
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
