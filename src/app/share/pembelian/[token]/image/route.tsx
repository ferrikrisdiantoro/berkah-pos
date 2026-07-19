import { createClient } from "@/lib/supabase/server";
import { renderReceiptImage } from "@/lib/receipt-image";
import { getBaseUrl } from "@/lib/base-url";
import { formatNumber, formatTanggal } from "@/lib/utils";
import type { DocItem } from "@/lib/types";
import type { ReceiptData } from "@/lib/native-print";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_purchase", { p_token: token });
  if (!data || !data.purchase) return new Response("Not found", { status: 404 });

  const p = data.purchase;
  const b = data.business ?? {};
  const items = ((data.items ?? []) as DocItem[]).sort((a, b2) => a.position - b2.position);

  const receipt: ReceiptData = {
    storeName: b.name ?? "WL Pemburu Bandeng",
    address: b.address,
    phone: b.phone,
    footer: b.footer_note,
    bankInfo: b.bank_info,
    signature: b.signature_note,
    title: b.receipt_title_purchase ?? "NOTA PEMBELIAN",
    number: p.number,
    dateLabel: formatTanggal(p.date),
    contactRole: "Supplier",
    contactName: data.contact?.name ?? "-",
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
    subtotal: formatNumber(p.subtotal),
    total: formatNumber(p.total),
    bayar: formatNumber(p.paid_total),
    sisa: formatNumber(Math.max(0, Number(p.total) - Number(p.paid_total))),
  };

  const logo = b.logo_url
    ? b.logo_url.startsWith("http") || b.logo_url.startsWith("data:")
      ? b.logo_url
      : `${await getBaseUrl()}${b.logo_url}`
    : null;
  return renderReceiptImage(receipt, logo);
}
