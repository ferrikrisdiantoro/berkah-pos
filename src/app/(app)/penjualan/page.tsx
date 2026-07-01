import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
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

export default async function PenjualanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales")
    .select("id, number, date, total, paid_total, status, contact:contacts(name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const nameOf = (c: Row["contact"]) => (Array.isArray(c) ? c[0]?.name : c?.name);

  return (
    <div>
      <PageHeader title="Penjualan" subtitle="Nota penjualan ke pelanggan.">
        <Link href="/penjualan/new">
          <Button>
            <Plus className="h-4 w-4" /> Nota Baru
          </Button>
        </Link>
      </PageHeader>

      <Card>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Belum ada nota penjualan.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nomor</TH>
                <TH>Pelanggan</TH>
                <TH>Tanggal</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Sisa</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">
                    <Link href={`/penjualan/${s.id}`} className="text-primary hover:underline">
                      {s.number}
                    </Link>
                  </TD>
                  <TD>{nameOf(s.contact) ?? "—"}</TD>
                  <TD>{formatTanggal(s.date)}</TD>
                  <TD className="text-right">{formatRupiah(s.total)}</TD>
                  <TD className="text-right">
                    {formatRupiah(Number(s.total) - Number(s.paid_total))}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
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
