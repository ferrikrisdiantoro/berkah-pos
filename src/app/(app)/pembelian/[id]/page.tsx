import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceDocument, type InvoicePayment } from "@/components/invoice-document";
import { InvoiceToolbar } from "@/components/invoice-toolbar";
import { PaymentForm } from "@/components/payment-form";
import {
  addPurchasePaymentAction,
  deletePurchasePaymentAction,
  deletePurchaseAction,
} from "@/lib/actions/purchases";
import { DeleteButton } from "@/components/delete-button";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { getBaseUrl } from "@/lib/base-url";
import type { BankAccount, BusinessSettings, Contact, DocItem, Purchase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: purchase }, { data: business }, { data: accounts }] = await Promise.all([
    supabase
      .from("purchases")
      .select("*, contact:contacts(*), items:purchase_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", 1).single(),
    supabase.from("bank_accounts").select("*").eq("is_active", true).order("name"),
  ]);

  if (!purchase) notFound();

  const { data: payRows } = await supabase
    .from("payments")
    .select("id, date, amount, method, account:bank_accounts(name)")
    .eq("purchase_id", id)
    .order("date");

  const p = purchase as unknown as Purchase & {
    contact: Contact | null;
    items: DocItem[];
  };
  const items = [...(p.items ?? [])].sort((a, b) => a.position - b.position);
  const payments = (payRows ?? []).map((r) => {
    const acc = r.account as { name?: string } | { name?: string }[] | null;
    return {
      date: r.date,
      amount: Number(r.amount),
      method: r.method,
      account: Array.isArray(acc) ? acc[0]?.name ?? null : acc?.name ?? null,
    } as InvoicePayment;
  });

  const remaining = Number(p.total) - Number(p.paid_total);
  const base = await getBaseUrl();
  const shareUrl = `${base}/share/pembelian/${p.share_token}`;
  const imageUrl = `${base}/share/pembelian/${p.share_token}/image`;
  const caption = `Nota Pembelian ${p.number} — ${formatRupiah(p.total)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/pembelian"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <InvoiceToolbar
          editHref={`/pembelian/${p.id}/edit`}
          shareUrl={shareUrl}
          strukHref={`/pembelian/${p.id}/struk`}
          imageUrl={imageUrl}
          caption={caption}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <InvoiceDocument
            business={business as BusinessSettings}
            doc={p}
            contact={p.contact}
            items={items}
            payments={payments}
            docType="purchase"
          />
        </div>

        <div className="no-print flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Total" value={formatRupiah(p.total)} />
              <Row label="Terbayar" value={formatRupiah(p.paid_total)} />
              <Row label="Sisa Tagihan" value={formatRupiah(Math.max(0, remaining))} strong />
            </CardContent>
          </Card>

          {remaining > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Catat Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  action={addPurchasePaymentAction}
                  docId={p.id}
                  docField="purchase_id"
                  accounts={(accounts ?? []) as BankAccount[]}
                  remaining={remaining}
                />
              </CardContent>
            </Card>
          )}

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
                    <form action={deletePurchasePaymentAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="purchase_id" value={p.id} />
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
            action={deletePurchaseAction}
            id={p.id}
            redirectTo="/pembelian"
            confirmText={`Hapus nota ${p.number}? Stok akan dikembalikan.`}
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
