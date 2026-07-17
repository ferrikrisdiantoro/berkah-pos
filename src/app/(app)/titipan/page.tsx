import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah, formatNumber, formatTanggal } from "@/lib/utils";
import type { Consignment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TitipanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consignments")
    .select("*, owner:contacts(name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as (Consignment & { owner: { name: string } | { name: string }[] | null })[];

  const ownerName = (o: Consignment["owner"] | { name: string } | { name: string }[] | null) =>
    Array.isArray(o) ? o[0]?.name : (o as { name?: string } | null)?.name;

  const komisiLabel = (c: Consignment) =>
    c.commission_type === "percent"
      ? `${formatNumber(c.commission_value)}%`
      : `${formatRupiah(c.commission_value)}/unit`;

  return (
    <div>
      <PageHeader title="Barang Titipan (Konsinyasi)" subtitle="Barang milik orang yang dijualkan toko.">
        <Link href="/titipan/new">
          <Button>
            <Plus className="h-4 w-4" /> Terima Titipan
          </Button>
        </Link>
      </PageHeader>

      {rows.some((c) => Number(c.commission_value) <= 0) && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <b className="text-amber-700">⚠️ Ada titipan dengan komisi 0%</b>
          <p className="mt-1 text-amber-900">
            Titipan bertanda <b>Komisi 0</b> di bawah membuat toko <b>tidak dapat komisi</b> —
            seluruh hasil penjualan jadi hak pemilik. Klik ikon pensil untuk mengisi komisinya
            (mis. 5%).
          </p>
        </div>
      )}

      <Card>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Belum ada barang titipan.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pemilik / Barang</TH>
                <TH>Tanggal</TH>
                <TH className="text-right">Sisa / Masuk</TH>
                <TH className="text-right">Komisi</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="font-medium">{c.product_name}</div>
                    <div className="text-xs text-muted-foreground">{ownerName(c.owner) ?? "—"}</div>
                  </TD>
                  <TD className="text-sm text-muted-foreground">{formatTanggal(c.received_date)}</TD>
                  <TD className="text-right">
                    {formatNumber(c.qty_remaining)} / {formatNumber(c.qty_in)} {c.unit ?? ""}
                  </TD>
                  <TD className="text-right">
                    {Number(c.commission_value) <= 0 ? (
                      <Badge tone="warning">Komisi 0</Badge>
                    ) : (
                      komisiLabel(c)
                    )}
                  </TD>
                  <TD>
                    {c.status === "open" ? (
                      <Badge tone="success">Aktif</Badge>
                    ) : (
                      <Badge tone="muted">Habis</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <Link href={`/titipan/${c.id}`}>
                      <Button variant="ghost" size="icon" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
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
