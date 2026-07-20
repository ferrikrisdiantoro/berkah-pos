import { formatNumber, formatTanggalPendek } from "@/lib/utils";
import { type BusinessSettings, type Contact, type DocItem, type Purchase } from "@/lib/types";

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
        <div className="text-[15px] font-bold leading-tight text-blue-700">
          {b.name ?? "WL Pemburu Bandeng"}
        </div>
        {b.address && <div className="text-[9px] leading-tight">{b.address}</div>}
        {b.phone && <div className="text-[9px]">Telp: {b.phone}</div>}
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-[10px] leading-snug">
        <div>
          {docType === "purchase" ? "Tagihan Dari Supplier : " : "Tagihan Kepada Pelanggan : "}
          <span className="text-[13px] font-bold">{contact?.name ?? "-"}</span>
        </div>
        <div>
          {(docType === "sale" ? b.receipt_title_sale : b.receipt_title_purchase) ??
            TITLE[docType]}
          : {doc.number}
        </div>
        <div>Tanggal : {formatTanggalPendek(doc.date)}</div>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      <table className="w-full text-[10px] leading-snug">
        <thead>
          <tr className="text-left align-bottom text-[10px] font-bold text-black">
            <th className="font-bold">Produk</th>
            <th className="text-right font-bold">Kuantitas</th>
            <th className="text-right font-bold">Harga</th>
            <th className="text-right font-bold">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="align-top">
              <td className="pr-1 font-semibold">
                {it.description}
                {it.price_pending ? " *" : ""}
              </td>
              <td className="text-right">{formatNumber(it.qty)}</td>
              <td className="text-right">
                {it.price_pending ? "—" : formatNumber(it.unit_price)}
              </td>
              <td className="text-right">
                {it.price_pending ? "—" : formatNumber(it.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.some((it) => it.price_pending) && (
        <div className="text-[9px] italic">* harga menyusul (total belum final)</div>
      )}

      <div className="my-1 border-t border-dashed border-black" />

      <div className="text-[10px] leading-snug">
        {Number(doc.discount_total) > 0 && (
          <Row label="Diskon" value={"-" + formatNumber(doc.discount_total)} />
        )}
        {Number(doc.tax_total) > 0 && <Row label="Pajak" value={formatNumber(doc.tax_total)} />}
        <Row label="TOTAL" value={formatNumber(doc.total)} strong />
        <Row label="SISA TAGIHAN" value={formatNumber(sisa)} strong />
        {bayar > 0 && <Row label="Bayar" value={formatNumber(bayar)} />}
        {previousDebt > 0 && (
          <>
            <Row label="Sisa Hutang" value={formatNumber(previousDebt)} />
            <Row label="Total Hutang" value={formatNumber(sisa + previousDebt)} />
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
        {b.signature_note && <div className="mt-0.5">{b.signature_note}</div>}
      </div>
    </div>
  );
}

/** Baris ringkasan: label & nilai sama-sama rata kanan (satu blok, gaya nota). */
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-end ${strong ? "text-[12px] font-bold" : ""}`}>
      <span className="pr-2 text-right">{label}</span>
      <span className="w-[38%] text-right">{value}</span>
    </div>
  );
}
