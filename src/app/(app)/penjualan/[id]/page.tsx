import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceDocument, type InvoicePayment } from "@/components/invoice-document";
import { InvoiceToolbar } from "@/components/invoice-toolbar";
import { Badge } from "@/components/ui/badge";
import {
  SalePaymentForm,
  type PayableItem,
} from "@/components/sale-payment-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteSalePaymentAction, deleteSaleAction } from "@/lib/actions/sales";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";
import { getPreviousDebts } from "@/lib/customer-debt";
import type { BankAccount, BusinessSettings, Contact, DocItem, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, { data: business }, { data: accounts }] = await Promise.all([
    supabase
      .from("sales")
      .select("*, contact:contacts(*), items:sale_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", 1).single(),
    supabase.from("bank_accounts").select("*").eq("is_active", true).order("name"),
  ]);

  if (!sale) notFound();

  const { data: payRows } = await supabase
    .from("payments")
    .select("id, date, amount, method, account:bank_accounts(name)")
    .eq("sale_id", id)
    .order("date");

  const s = sale as unknown as Sale & { contact: Contact | null; items: DocItem[] };
  const items = [...(s.items ?? [])].sort((a, b) => a.position - b.position);
  const payments = (payRows ?? []).map((r) => {
    const acc = r.account as { name?: string } | { name?: string }[] | null;
    return {
      date: r.date,
      amount: Number(r.amount),
      method: r.method,
      account: Array.isArray(acc) ? acc[0]?.name ?? null : acc?.name ?? null,
    } as InvoicePayment;
  });

  // Alokasi pembayaran per item (R3)
  const itemIds = items.map((i) => i.id);
  const { data: allocs } = itemIds.length
    ? await supabase
        .from("payment_allocations")
        .select("sale_item_id, amount")
        .in("sale_item_id", itemIds)
    : { data: [] as { sale_item_id: string; amount: number }[] };

  const paidByItem = new Map<string, number>();
  for (const a of allocs ?? []) {
    paidByItem.set(
      a.sale_item_id,
      (paidByItem.get(a.sale_item_id) ?? 0) + Number(a.amount),
    );
  }
  const payableItems: PayableItem[] = items.map((it) => {
    const paid = paidByItem.get(it.id) ?? 0;
    return {
      id: it.id,
      description: it.description,
      lineTotal: Number(it.line_total),
      paid,
      outstanding: Math.max(0, Number(it.line_total) - paid),
    };
  });

  const remaining = Number(s.total) - Number(s.paid_total);

  // Tunggakan pelanggan yang sama dari nota lain (tanggal <= nota ini).
  const { list: prevDebts, total: prevTotal } = await getPreviousDebts(
    supabase,
    "sales",
    s.contact_id,
    s.id,
    s.date,
  );

  const base = await getBaseUrl();
  const shareUrl = `${base}/share/penjualan/${s.share_token}`;
  const imageUrl = `${base}/share/penjualan/${s.share_token}/image`;
  const caption = `Nota Penjualan ${s.number} — ${formatRupiah(s.total)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/penjualan"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <InvoiceToolbar
          editHref={`/penjualan/${s.id}/edit`}
          shareUrl={shareUrl}
          strukHref={`/penjualan/${s.id}/struk`}
          imageUrl={imageUrl}
          caption={caption}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <InvoiceDocument
            business={business as BusinessSettings}
            doc={s}
            contact={s.contact}
            items={items}
            payments={payments}
            docType="sale"
            previousDebt={prevTotal}
          />
        </div>

        <div className="no-print flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Total" value={formatRupiah(s.total)} />
              <Row label="Terbayar" value={formatRupiah(s.paid_total)} />
              <Row label="Sisa Tagihan" value={formatRupiah(Math.max(0, remaining))} strong />
            </CardContent>
          </Card>

          {prevDebts.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="text-amber-700">
                  Tunggakan Sebelumnya
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  {s.contact?.name ?? "Pelanggan ini"} masih punya sisa tagihan dari
                  nota lain:
                </p>
                {prevDebts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/penjualan/${d.id}`}
                      className="min-w-0 flex-1 truncate text-primary hover:underline"
                    >
                      {d.number}
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatTanggal(d.date)}
                      </span>
                    </Link>
                    <span className="font-medium">{formatRupiah(d.sisa)}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-border pt-2">
                  <span className="font-semibold text-amber-700">Total Tunggakan</span>
                  <span className="font-bold text-amber-700">
                    {formatRupiah(prevTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total utang termasuk nota ini
                  </span>
                  <span className="font-semibold">
                    {formatRupiah(prevTotal + Math.max(0, remaining))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {remaining > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Catat Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <SalePaymentForm
                  saleId={s.id}
                  accounts={(accounts ?? []) as BankAccount[]}
                  items={payableItems}
                  remaining={remaining}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status Bayar per Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payableItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{i.description}</span>
                  {i.outstanding <= 0 ? (
                    <Badge tone="success">Lunas</Badge>
                  ) : i.paid > 0 ? (
                    <Badge tone="warning">Sisa {formatRupiah(i.outstanding)}</Badge>
                  ) : (
                    <Badge tone="danger">Belum</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {payRows && payRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payRows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{formatRupiah(r.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTanggal(r.date)}
                      </div>
                    </div>
                    <form action={deleteSalePaymentAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="sale_id" value={s.id} />
                      <Button variant="ghost" size="icon" type="submit" aria-label="Hapus">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </form>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <DeleteButton
            action={deleteSaleAction}
            id={s.id}
            redirectTo="/penjualan"
            confirmText={`Hapus nota ${s.number}? Stok akan dikembalikan.`}
            label="Hapus Nota"
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
