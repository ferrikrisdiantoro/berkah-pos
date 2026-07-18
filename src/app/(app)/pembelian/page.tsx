import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { SearchFilter } from "@/components/search-filter";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, type DocStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  number: string;
  date: string;
  total: number;
  paid_total: number;
  status: DocStatus;
  contact: { name: string } | { name: string }[] | null;
};

export default async function PembelianPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string; from?: string; to?: string }>;
}) {
  const { q, f, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("purchases")
    .select("id, number, date, total, paid_total, status, contact:contacts(name)");
  if (f) query = query.eq("status", f);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data } = await query.order("date", { ascending: false }).order("created_at", {
    ascending: false,
  });
  let rows = (data ?? []) as Row[];

  const nameOf = (c: Row["contact"]) => (Array.isArray(c) ? c[0]?.name : c?.name);

  // Cari berdasar nomor nota atau nama supplier.
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.number.toLowerCase().includes(s) ||
        (nameOf(r.contact) ?? "").toLowerCase().includes(s),
    );
  }

  return (
    <div>
      <PageHeader title="Pembelian" subtitle="Nota pembelian dari supplier.">
        <Link href="/pembelian/new">
          <Button>
            <Plus className="h-4 w-4" /> Nota Baru
          </Button>
        </Link>
      </PageHeader>

      <SearchFilter
        placeholder="Cari nota / nama supplier…"
        dateRange
        filterLabel="Semua status"
        filters={[
          { value: "paid", label: "Lunas" },
          { value: "partial", label: "Bayar sebagian (DP)" },
          { value: "unpaid", label: "Belum bayar" },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada nota yang cocok.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nomor</TH>
                <TH>Supplier</TH>
                <TH>Tanggal</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Sisa</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id} className="cursor-pointer">
                  <TD className="font-medium">
                    <Link href={`/pembelian/${p.id}`} className="text-primary hover:underline">
                      {p.number}
                    </Link>
                  </TD>
                  <TD>{nameOf(p.contact) ?? "—"}</TD>
                  <TD>{formatTanggal(p.date)}</TD>
                  <TD className="text-right">{formatRupiah(p.total)}</TD>
                  <TD className="text-right">
                    {formatRupiah(Number(p.total) - Number(p.paid_total))}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
