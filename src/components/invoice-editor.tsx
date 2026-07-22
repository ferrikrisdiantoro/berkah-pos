"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah, todayISO } from "@/lib/utils";
import type { Contact, DocItem, Product } from "@/lib/types";

export type ConsignmentOption = {
  id: string;
  label: string; // teks di dropdown
  desc: string; // deskripsi baris nota
  base_price: number;
};

type Row = {
  key: string;
  product_id: string | null;
  consignment_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  price_pending: boolean;
  /** Qty di nota supplier (pembelian saja) — null = tak diisi/tak ada selisih. */
  vendor_qty: number | null;
};

export type InvoiceInitial = {
  id: string;
  contact_id: string | null;
  date: string;
  due_date: string | null;
  notes: string | null;
  status: string;
  items: DocItem[];
  manual_previous_debt?: number | null;
};

let rowSeq = 0;
const newRow = (): Row => ({
  key: `r${rowSeq++}`,
  product_id: null,
  consignment_id: null,
  description: "",
  qty: 1,
  unit_price: 0,
  discount_pct: 0,
  price_pending: false,
  vendor_qty: null,
});

function lineTotal(r: Row) {
  return Math.round(r.qty * r.unit_price * (1 - (r.discount_pct || 0) / 100));
}

export function InvoiceEditor({
  kind,
  contacts,
  products,
  action,
  initial,
  consignments,
}: {
  kind: "purchase" | "sale";
  contacts: Contact[];
  products: Product[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initial?: InvoiceInitial;
  consignments?: ConsignmentOption[];
}) {
  const [contactId, setContactId] = useState(initial?.contact_id ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [manualOn, setManualOn] = useState(initial?.manual_previous_debt != null);
  const [manualDebt, setManualDebt] = useState<number>(
    initial?.manual_previous_debt != null ? Number(initial.manual_previous_debt) : 0,
  );
  const [rows, setRows] = useState<Row[]>(
    initial && initial.items.length
      ? initial.items.map((it) => ({
          key: `r${rowSeq++}`,
          product_id: it.product_id,
          consignment_id: it.consignment_id ?? null,
          description: it.description,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct),
          price_pending: !!it.price_pending,
          vendor_qty: it.vendor_qty == null ? null : Number(it.vendor_qty),
        }))
      : [newRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const contactLabel = kind === "purchase" ? "Supplier" : "Pelanggan";
  const priceField = kind === "purchase" ? "buy_price" : "sell_price";

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + lineTotal(r), 0),
    [rows],
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pickProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    const price = p ? Number(p[priceField]) : 0;
    update(key, {
      product_id: productId || null,
      // Dropdown gabungan: pastikan pindah dari titipan ke produk tidak
      // menyisakan consignment_id lama (baris tak boleh bawa dua ID).
      consignment_id: null,
      description: p ? p.name : "",
      unit_price: price,
      // Produk berharga -> batalkan "harga menyusul" supaya harga tak dibuang.
      ...(price > 0 ? { price_pending: false } : {}),
    });
  }

  function pickConsignment(key: string, id: string) {
    if (!id) {
      update(key, { consignment_id: null });
      return;
    }
    const c = consignments?.find((x) => x.id === id);
    // Harga titip sering dikosongkan (belum tahu harga) -> JANGAN isi 0,
    // biarkan kosong supaya admin wajib mengetik harga jual.
    update(key, {
      consignment_id: id,
      product_id: null,
      description: c ? c.desc : "",
      unit_price: c && c.base_price > 0 ? c.base_price : 0,
      // Titipan berharga -> batalkan "harga menyusul" supaya harga tak dibuang.
      ...(c && c.base_price > 0 ? { price_pending: false } : {}),
    });
  }

  // Satu dropdown gabungan: produk biasa + barang titipan.
  // Nilai di-encode "p:<id>" (produk) atau "c:<id>" (titipan).
  function pickItem(key: string, val: string) {
    if (!val) {
      update(key, { product_id: null, consignment_id: null });
      return;
    }
    const id = val.slice(2);
    if (val.startsWith("c:")) pickConsignment(key, id);
    else pickProduct(key, id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = rows
      .filter((r) => r.description.trim() && r.qty > 0)
      .map((r) => ({
        product_id: r.product_id,
        consignment_id: r.consignment_id,
        description: r.description.trim(),
        qty: r.qty,
        // Item "harga menyusul" wajib 0 sampai harganya diisi.
        unit_price: r.price_pending ? 0 : r.unit_price,
        discount_pct: r.price_pending ? 0 : r.discount_pct,
        tax_pct: 0,
        price_pending: r.price_pending,
        vendor_qty: kind === "purchase" ? r.vendor_qty : null,
      }));
    if (!contactId) return setError(`Pilih ${contactLabel.toLowerCase()}.`);
    if (items.length === 0) return setError("Tambahkan minimal satu item.");

    // Harga wajib diisi KECUALI ditandai "harga menyusul".
    const noPrice = items.filter((i) => !i.price_pending && (!i.unit_price || i.unit_price <= 0));
    if (noPrice.length > 0) {
      return setError(
        `Harga belum diisi untuk: ${noPrice.map((i) => i.description).join(", ")}. Isi harga atau centang "harga menyusul".`,
      );
    }

    const fd = new FormData();
    if (initial) fd.set("id", initial.id);
    fd.set("contact_id", contactId);
    fd.set("date", date);
    fd.set("due_date", dueDate);
    fd.set("notes", notes);
    fd.set("status", initial?.status ?? "unpaid");
    fd.set("items", JSON.stringify(items));
    // Tunggakan manual: kosong = pakai hitungan otomatis.
    fd.set("manual_previous_debt", manualOn ? String(manualDebt || 0) : "");

    setSaving(true);
    const res = await action(fd);
    setSaving(false);
    if (res && "error" in res && res.error) setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>{contactLabel}</Label>
            <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— Pilih {contactLabel} —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` — ${c.city}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jatuh Tempo</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-2 font-semibold">Produk / Deskripsi</th>
                  <th className="pb-2 px-2 text-right font-semibold">
                    Qty{kind === "purchase" ? " / Qty Vendor" : ""}
                  </th>
                  <th className="pb-2 px-2 text-right font-semibold">Harga</th>
                  <th className="pb-2 px-2 text-right font-semibold">Disk %</th>
                  <th className="pb-2 px-2 text-right font-semibold">Jumlah</th>
                  <th className="pb-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-2">
                      <Select
                        className="mb-1 h-9"
                        value={
                          r.consignment_id
                            ? `c:${r.consignment_id}`
                            : r.product_id
                              ? `p:${r.product_id}`
                              : ""
                        }
                        onChange={(e) => pickItem(r.key, e.target.value)}
                      >
                        <option value="">— Pilih barang / ketik manual —</option>
                        {products.length > 0 && (
                          <optgroup label="Produk">
                            {products.map((p) => (
                              <option key={p.id} value={`p:${p.id}`}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {consignments && consignments.length > 0 && (
                          <optgroup label="Barang Titipan">
                            {consignments.map((c) => (
                              <option key={c.id} value={`c:${c.id}`}>
                                {c.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </Select>
                      <Input
                        className="h-9"
                        placeholder="Deskripsi"
                        value={r.description}
                        onChange={(e) => update(r.key, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-24 text-right"
                        type="number"
                        step="any"
                        min="0"
                        value={r.qty}
                        onChange={(e) => update(r.key, { qty: Number(e.target.value) })}
                      />
                      {kind === "purchase" && (
                        <>
                          <Input
                            className="mt-1 h-8 w-24 text-right text-xs"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Qty vendor"
                            value={r.vendor_qty ?? ""}
                            onChange={(e) =>
                              update(r.key, {
                                vendor_qty: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          {r.vendor_qty != null && (
                            <div
                              className={`mt-0.5 text-right text-[11px] ${
                                r.qty - r.vendor_qty < 0 ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              susut {(r.qty - r.vendor_qty).toFixed(2)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <MoneyInput
                        className={`h-9 w-32 ${r.price_pending ? "opacity-40" : ""}`}
                        value={r.price_pending ? 0 : r.unit_price}
                        onValueChange={(v) => update(r.key, { unit_price: v })}
                        placeholder={r.price_pending ? "menyusul" : "Harga"}
                      />
                      <label className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={r.price_pending}
                          onChange={(e) =>
                            update(r.key, {
                              price_pending: e.target.checked,
                              unit_price: e.target.checked ? 0 : r.unit_price,
                            })
                          }
                        />
                        harga menyusul
                      </label>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-20 text-right"
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={r.discount_pct}
                        onChange={(e) =>
                          update(r.key, { discount_pct: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium">
                      {formatRupiah(lineTotal(r))}
                    </td>
                    <td className="py-2 pl-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setRows((rs) =>
                            rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs,
                          )
                        }
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, newRow()])}
            >
              <Plus className="h-4 w-4" /> Tambah Baris
            </Button>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{formatRupiah(grandTotal)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label htmlFor="notes">Catatan</Label>
          <Textarea
            id="notes"
            className="mt-1.5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan untuk nota (opsional)"
          />
        </CardContent>
      </Card>

      {kind === "sale" && (
        <Card>
          <CardContent className="pt-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={manualOn}
                onChange={(e) => setManualOn(e.target.checked)}
              />
              Timpa tunggakan sebelumnya khusus nota ini (jarang dipakai)
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Untuk koreksi satu nota saja. Biasanya TIDAK perlu — tunggakan
              lama yang berulang cukup dicatat sekali di halaman Kontak
              pelanggan ini (&quot;Tunggakan Lama&quot;), nanti otomatis
              terbawa ke tiap nota baru tanpa diketik ulang. Kosongkan centang
              ini untuk pakai hitungan otomatis.
            </p>
            {manualOn && (
              <div className="mt-3 max-w-xs">
                <Label>Tunggakan Sebelumnya (Rp)</Label>
                <MoneyInput
                  className="mt-1.5 h-10"
                  value={manualDebt}
                  onValueChange={setManualDebt}
                  placeholder="0"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan Nota"}
        </Button>
      </div>
    </form>
  );
}
