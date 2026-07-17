import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiptDocument } from "@/components/receipt-document";
import { ReceiptActions } from "@/components/receipt-actions";
import { NativePrintButton } from "@/components/native-print-button";
import { formatRupiah, formatNumber, formatTanggal } from "@/lib/utils";
import type { ReceiptData } from "@/lib/native-print";
import type { BusinessSettings, Contact, DocItem, Purchase } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@page { size: 58mm auto; margin: 0; }
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .receipt-area { width: 58mm !important; padding: 3mm 2mm !important; margin: 0 !important; }
}
`;

export default async function StrukPembelianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: purchase }, { data: business }] = await Promise.all([
    supabase
      .from("purchases")
      .select("*, contact:contacts(*), items:purchase_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", 1).single(),
  ]);
  if (!purchase) notFound();

  const p = purchase as unknown as Purchase & { contact: Contact | null; items: DocItem[] };
  const items = [...(p.items ?? [])].sort((a, b) => a.position - b.position);
  const b = (business ?? {}) as Partial<BusinessSettings>;

  const receiptData: ReceiptData = {
    storeName: b.name ?? "WL Pemburu Bandeng",
    address: b.address,
    phone: b.phone,
    footer: b.footer_note,
    bankInfo: b.bank_info,
    signature: b.signature_note,
    statusLabel:
      p.status === "paid" ? "*** LUNAS ***" : p.status === "partial" ? "*** DP ***" : "*** BELUM LUNAS ***",
    title: b.receipt_title_purchase ?? "NOTA PEMBELIAN",
    number: p.number,
    dateLabel: formatTanggal(p.date),
    contactRole: "Supplier",
    contactName: p.contact?.name ?? "-",
    items: items.map((it) => ({
      description: it.description,
      qtyPrice: `${formatNumber(it.qty)} x ${formatRupiah(it.unit_price)}`,
      total: formatRupiah(it.line_total),
    })),
    subtotal: formatRupiah(p.subtotal),
    total: formatRupiah(p.total),
    bayar: formatRupiah(p.paid_total),
    sisa: formatRupiah(Math.max(0, Number(p.total) - Number(p.paid_total))),
  };

  return (
    <div className="min-h-screen bg-muted">
      <style>{PRINT_CSS}</style>
      <ReceiptActions>
        <NativePrintButton data={receiptData} />
      </ReceiptActions>
      <div className="mx-auto max-w-[58mm] bg-white shadow-sm">
        <ReceiptDocument
          business={business as BusinessSettings}
          doc={p}
          contact={p.contact}
          items={items}
          docType="purchase"
        />
      </div>
    </div>
  );
}
