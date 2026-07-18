import { formatRupiah, formatNumber, formatTanggal } from "@/lib/utils";
import {
  STATUS_LABEL,
  type BusinessSettings,
  type Contact,
  type DocItem,
  type DocStatus,
  type Purchase,
} from "@/lib/types";

export type InvoicePayment = {
  date: string;
  amount: number;
  method: string | null;
  account: string | null;
};

const TITLE = {
  purchase: "NOTA PEMBELIAN",
  sale: "NOTA PENJUALAN",
};

/**
 * Layout nota untuk dilihat / dicetak / dibagikan.
 * Presentational murni — aman dipakai di server & di halaman publik.
 */
export function InvoiceDocument({
  business,
  doc,
  contact,
  items,
  payments,
  docType,
}: {
  business: Partial<BusinessSettings> | null;
  doc: Pick<
    Purchase,
    "number" | "date" | "due_date" | "status" | "subtotal" | "discount_total" | "tax_total" | "total" | "paid_total" | "notes"
  >;
  contact: Partial<Contact> | null;
  items: DocItem[];
  payments: InvoicePayment[];
  docType: "purchase" | "sale";
}) {
  const sisa = Math.max(0, Number(doc.total) - Number(doc.paid_total));
  const b = business ?? {};

  return (
    <div className="print-area mx-auto w-full max-w-3xl rounded-lg bg-white p-8 text-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div className="flex items-start gap-3">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.logo_url}
              alt="Logo"
              className="h-28 w-28 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
              {(b.name ?? "BM").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-lg font-bold text-slate-900">
              {b.name ?? "WL Pemburu Bandeng"}
            </div>
            {b.address && (
              <div className="max-w-xs text-xs text-slate-500">{b.address}</div>
            )}
            {b.phone && <div className="text-xs text-slate-500">Telp: {b.phone}</div>}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              doc.status === "paid"
                ? "bg-green-100 text-green-700"
                : doc.status === "partial"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {STATUS_LABEL[doc.status as DocStatus]}
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {(docType === "sale" ? b.receipt_title_sale : b.receipt_title_purchase) ??
              TITLE[docType]}
          </h1>
          <div className="text-sm text-slate-500">{doc.number}</div>
        </div>
      </div>

      {/* Info */}
      <div className="flex justify-between py-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {docType === "purchase" ? "Tagihan Kepada" : "Kepada"}
          </div>
          <div className="mt-1 font-semibold text-slate-900">
            {contact?.name ?? "—"}
          </div>
          {contact?.city && <div className="text-sm text-slate-500">{contact.city}</div>}
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-500">
            Tanggal : <span className="font-semibold text-slate-800">{formatTanggal(doc.date)}</span>
          </div>
          {doc.due_date && (
            <div className="mt-1 text-slate-500">
              Tgl. Jatuh Tempo :{" "}
              <span className="font-semibold text-slate-800">{formatTanggal(doc.due_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-xs uppercase text-slate-400">
            <th className="py-2 text-left font-semibold">Produk</th>
            <th className="py-2 text-right font-semibold">Kuantitas</th>
            <th className="py-2 text-right font-semibold">Harga</th>
            <th className="py-2 text-right font-semibold">Diskon</th>
            <th className="py-2 text-right font-semibold">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100">
              <td className="py-2.5 font-medium text-slate-800">
                {it.description}
                {it.price_pending && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    menunggu harga
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right">{formatNumber(it.qty)}</td>
              <td className="py-2.5 text-right">
                {it.price_pending ? "—" : formatRupiah(it.unit_price)}
              </td>
              <td className="py-2.5 text-right">
                {Number(it.discount_pct) > 0 ? `${formatNumber(it.discount_pct)}%` : "0%"}
              </td>
              <td className="py-2.5 text-right font-medium">
                {it.price_pending ? "—" : formatRupiah(it.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.some((it) => it.price_pending) && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠ Ada barang yang harganya <b>menyusul</b> — total di bawah <b>belum final</b>,
          akan bertambah setelah harganya diisi.
        </div>
      )}

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Sub Total</span>
            <span className="text-slate-800">{formatRupiah(doc.subtotal)}</span>
          </div>
          {Number(doc.discount_total) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Diskon</span>
              <span className="text-slate-800">- {formatRupiah(doc.discount_total)}</span>
            </div>
          )}
          {Number(doc.tax_total) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Pajak</span>
              <span className="text-slate-800">{formatRupiah(doc.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatRupiah(doc.total)}</span>
          </div>
          {payments.length > 0 && (
            <>
              <div className="pt-2 text-xs font-semibold uppercase text-slate-400">
                Pembayaran
              </div>
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-slate-500">
                  <span>{p.account ?? p.method ?? "Pembayaran"}</span>
                  <span className="text-slate-800">{formatRupiah(p.amount)}</span>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
            <span>Sisa Tagihan</span>
            <span>{formatRupiah(sisa)}</span>
          </div>
        </div>
      </div>

      {/* Footer — semua teks diatur di Pengaturan */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
        {doc.notes && <p className="italic">{doc.notes}</p>}
        {b.footer_note && <p className="mt-1">{b.footer_note}</p>}
        {b.bank_info && (
          <p className="mt-2 whitespace-pre-line font-medium text-slate-700">{b.bank_info}</p>
        )}
        <p className="mt-3 font-semibold text-slate-700">
          ----- {b.name ?? "WL Pemburu Bandeng"} -----
        </p>
        {b.signature_note && <p className="mt-1">{b.signature_note}</p>}
      </div>
    </div>
  );
}
