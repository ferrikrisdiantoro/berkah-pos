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

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    f?: string;
    from?: string;
    to?: string;
    owner?: string;
    pend?: string;
  }>;
}) {
  const { q, f, from, to, owner, pend } = await searchParams;
  const supabase = await createClient();

  // Nota yang punya item "harga menyusul".
  const { data: pendRows } = await supabase
    .from("sale_items")
    .select("sale_id")
    .eq("price_pending", true);
  const pendingIds = new Set((pendRows ?? []).map((r) => r.sale_id));

  // Jika difilter per pemilik barang titipan, pakai inner-join ke sale_items.
  let query = owner
    ? supabase
        .from("sales")
        .select(
          "id, number, date, total, paid_total, status, contact:contacts(name), items:sale_items!inner(owner_id)",
        )
        .eq("items.owner_id", owner)
    : supabase
        .from("sales")
        .select("id, number, date, total, paid_total, status, contact:contacts(name)");

  if (f) query = query.eq("status", f);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data } = await query.order("date", { ascending: false }).order("created_at", {
    ascending: false,
  });
  let rows = (data ?? []) as Row[];

  const nameOf = (c: Row["contact"]) => (Array.isArray(c) ? c[0]?.name : c?.name);

  // Cari berdasar nomor nota atau nama pelanggan.
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.number.toLowerCase().includes(s) ||
        (nameOf(r.contact) ?? "").toLowerCase().includes(s),
    );
  }

  // Hanya nota yang masih ada item "harga menyusul".
  if (pend === "1") rows = rows.filter((r) => pendingIds.has(r.id));

  // Opsi pemilik barang (dari titipan yang ada).
  const { data: cons } = await supabase
    .from("consignments")
    .select("owner:contacts(id, name)");
  const ownerMap = new Map<string, string>();
  for (const c of cons ?? []) {
    const o = c.owner as { id?: string; name?: string } | { id?: string; name?: string }[] | null;
    const oo = Array.isArray(o) ? o[0] : o;
    if (oo?.id) ownerMap.set(oo.id, oo.name ?? "—");
  }
  const ownerOptions = [...ownerMap.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div>
      <PageHeader title="Penjualan" subtitle="Nota penjualan ke pelanggan.">
        <Link href="/penjualan/new">
          <Button>
            <Plus className="h-4 w-4" /> Nota Baru
          </Button>
        </Link>
      </PageHeader>

      <SearchFilter
        placeholder="Cari nota / nama pelanggan…"
        dateRange
        selects={[
          {
            param: "f",
            allLabel: "Semua status",
            options: [
              { value: "paid", label: "Lunas" },
              { value: "partial", label: "Bayar sebagian (DP)" },
              { value: "unpaid", label: "Belum bayar" },
            ],
          },
          ...(ownerOptions.length > 0
            ? [{ param: "owner", allLabel: "Semua pemilik barang", options: ownerOptions }]
            : []),
          {
            param: "pend",
            allLabel: "Semua harga",
            options: [{ value: "1", label: "Menunggu harga" }],
          },
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
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      {pendingIds.has(s.id) && <Badge tone="warning">Menunggu harga</Badge>}
                    </div>
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
