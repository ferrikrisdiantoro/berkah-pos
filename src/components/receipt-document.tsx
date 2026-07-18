import { formatRupiah, formatNumber, formatTanggal } from "@/lib/utils";
import { STATUS_LABEL, type BusinessSettings, type Contact, type DocItem, type DocStatus, type Purchase } from "@/lib/types";

const TITLE = { purchase: "NOTA PEMBELIAN", sale: "NOTA PENJUALAN" };

/**
 * Struk untuk printer thermal 58mm. Lebar kertas diatur lewat @page pada
 * halaman struk. Layout sengaja sempit, mono, hitam-putih.
 */
export function ReceiptDocument({
  business,
  doc,
  contact,
  items,
  docType,
  previousDebt = 0,
}: {
  business: Partial<BusinessSettings> | null;
  doc: Pick<Purchase, "number" | "date" | "due_date" | "status" | "subtotal" | "discount_total" | "tax_total" | "total" | "paid_total" | "notes">;
  contact: Partial<Contact> | null;
  items: DocItem[];
  docType: "purchase" | "sale";
  previousDebt?: number;
}) {
  const b = business ?? {};
  const sisa = Math.max(0, Number(doc.total) - Number(doc.paid_total));
  const bayar = Number(doc.paid_total);

  return (
    <div className="receipt-area mx-auto bg-white text-black">
      <div className="text-center">
        {b.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.logo_url} alt="Logo" className="mx-auto mb-1 h-24 w-24 object-contain" />
        )}
        <div className="text-[13px] font-bold leading-tight">{b.name ?? "WL Pemburu Bandeng"}</div>
        {b.address && <div className="text-[9px] leading-tight">{b.address}</div>}
        {b.phone && <div className="text-[9px]">Telp: {b.phone}</div>}
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-[10px] leading-snug">
        <div className="flex justify-between">
          <span>
            {(docType === "sale" ? b.receipt_title_sale : b.receipt_title_purchase) ??
              TITLE[docType]}
          </span>
          <span>{STATUS_LABEL[doc.status as DocStatus]}</span>
        </div>
        <div className="flex justify-between">
          <span>No</span>
          <span>{doc.number}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl</span>
          <span>{formatTanggal(doc.date)}</span>
        </div>
        <div className="flex justify-between">
          <span>{docType === "purchase" ? "Supplier" : "Pelanggan"}</span>
          <span className="max-w-[60%] truncate text-right">{contact?.name ?? "-"}</span>
        </div>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-[10px] leading-snug">
        {items.map((it) => (
          <div key={it.id} className="mb-1">
            <div className="font-semibold">
              {it.description}
              {it.price_pending ? " (harga menyusul)" : ""}
            </div>
            <div className="flex justify-between">
              <span>
                {it.price_pending
                  ? `${formatNumber(it.qty)} x —`
                  : `${formatNumber(it.qty)} x ${formatRupiah(it.unit_price)}`}
                {!it.price_pending && Number(it.discount_pct) > 0
                  ? ` -${formatNumber(it.discount_pct)}%`
                  : ""}
              </span>
              <span>{it.price_pending ? "—" : formatRupiah(it.line_total)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-[10px] leading-snug">
        <Row label="Subtotal" value={formatRupiah(doc.subtotal)} />
        {Number(doc.discount_total) > 0 && (
          <Row label="Diskon" value={"-" + formatRupiah(doc.discount_total)} />
        )}
        {Number(doc.tax_total) > 0 && <Row label="Pajak" value={formatRupiah(doc.tax_total)} />}
        <div className="flex justify-between text-[12px] font-bold">
          <span>TOTAL</span>
          <span>{formatRupiah(doc.total)}</span>
        </div>
        <Row label="Bayar" value={formatRupiah(bayar)} />
        <Row label="Sisa" value={formatRupiah(sisa)} />
        {previousDebt > 0 && (
          <>
            <Row label="Tunggakan lain" value={formatRupiah(previousDebt)} />
            <div className="flex justify-between text-[12px] font-bold">
              <span>TOTAL HUTANG</span>
              <span>{formatRupiah(sisa + previousDebt)}</span>
            </div>
          </>
        )}
        <div className="mt-1 text-center text-[13px] font-bold">
          {doc.status === "paid"
            ? "*** LUNAS ***"
            : doc.status === "partial"
              ? "*** BAYAR SEBAGIAN (DP) ***"
              : "*** BELUM LUNAS ***"}
        </div>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-center text-[9px] leading-tight">
        {b.footer_note && <div>{b.footer_note}</div>}
        {b.bank_info && (
          <div className="mt-1 whitespace-pre-line font-semibold">{b.bank_info}</div>
        )}
        <div className="mt-1">--- {b.name ?? "WL Pemburu Bandeng"} ---</div>
        {b.signature_note && <div className="mt-0.5">{b.signature_note}</div>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
