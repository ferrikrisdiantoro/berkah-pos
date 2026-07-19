import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPreviousDebts } from "@/lib/customer-debt";
import { ReceiptDocument } from "@/components/receipt-document";
import { ReceiptActions } from "@/components/receipt-actions";
import { NativePrintButton } from "@/components/native-print-button";
import { formatNumber, formatTanggal } from "@/lib/utils";
import type { ReceiptData } from "@/lib/native-print";
import type { BusinessSettings, Contact, DocItem, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@page { size: 58mm auto; margin: 0; }
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .receipt-area { width: 58mm !important; padding: 3mm 2mm !important; margin: 0 !important; }
}
`;

export default async function StrukPenjualanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, { data: business }] = await Promise.all([
    supabase
      .from("sales")
      .select("*, contact:contacts(*), items:sale_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", 1).single(),
  ]);
  if (!sale) notFound();

  const s = sale as unknown as Sale & { contact: Contact | null; items: DocItem[] };
  const items = [...(s.items ?? [])].sort((a, b) => a.position - b.position);
  const b = (business ?? {}) as Partial<BusinessSettings>;

  const sisaNota = Math.max(0, Number(s.total) - Number(s.paid_total));
  const { total: autoDebt } = await getPreviousDebts(
    supabase,
    "sales",
    s.contact_id,
    s.id,
    s.date,
  );
  const previousDebt = s.manual_previous_debt != null ? Number(s.manual_previous_debt) : autoDebt;

  const receiptData: ReceiptData = {
    storeName: b.name ?? "WL Pemburu Bandeng",
    address: b.address,
    phone: b.phone,
    footer: b.footer_note,
    bankInfo: b.bank_info,
    signature: b.signature_note,
    statusLabel:
      s.status === "paid" ? "*** LUNAS ***" : s.status === "partial" ? "*** DP ***" : "*** BELUM LUNAS ***",
    title: b.receipt_title_sale ?? "NOTA PENJUALAN",
    number: s.number,
    dateLabel: formatTanggal(s.date),
    contactRole: "Pelanggan",
    contactName: s.contact?.name ?? "-",
    items: items.map((it) => ({
      description: it.description,
      qtyPrice: it.price_pending
        ? `${formatNumber(it.qty)} x —`
        : `${formatNumber(it.qty)} x ${formatNumber(it.unit_price)}`,
      qty: formatNumber(it.qty),
      price: it.price_pending ? "—" : formatNumber(it.unit_price),
      total: it.price_pending ? "—" : formatNumber(it.line_total),
      pending: !!it.price_pending,
    })),
    subtotal: formatNumber(s.subtotal),
    total: formatNumber(s.total),
    bayar: formatNumber(s.paid_total),
    sisa: formatNumber(sisaNota),
    ...(previousDebt > 0
      ? {
          previousDebt: formatNumber(previousDebt),
          totalDebt: formatNumber(sisaNota + previousDebt),
        }
      : {}),
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
          doc={s}
          contact={s.contact}
          items={items}
          docType="sale"
          previousDebt={previousDebt}
        />
      </div>
    </div>
  );
}
