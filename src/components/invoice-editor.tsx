"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah, todayISO } from "@/lib/utils";
import type { Contact, DocItem, Product } from "@/lib/types";

type Row = {
  key: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
};

export type InvoiceInitial = {
  id: string;
  contact_id: string | null;
  date: string;
  due_date: string | null;
  notes: string | null;
  status: string;
  items: DocItem[];
};

let rowSeq = 0;
const newRow = (): Row => ({
  key: `r${rowSeq++}`,
  product_id: null,
  description: "",
  qty: 1,
  unit_price: 0,
  discount_pct: 0,
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
}: {
  kind: "purchase" | "sale";
  contacts: Contact[];
  products: Product[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initial?: InvoiceInitial;
}) {
  const [contactId, setContactId] = useState(initial?.contact_id ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    initial && initial.items.length
      ? initial.items.map((it) => ({
          key: `r${rowSeq++}`,
          product_id: it.product_id,
          description: it.description,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct),
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
    update(key, {
      product_id: productId || null,
      description: p ? p.name : "",
      unit_price: p ? Number(p[priceField]) : 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = rows
      .filter((r) => r.description.trim() && r.qty > 0)
      .map((r) => ({
        product_id: r.product_id,
        description: r.description.trim(),
        qty: r.qty,
        unit_price: r.unit_price,
        discount_pct: r.discount_pct,
        tax_pct: 0,
      }));
    if (!contactId) return setError(`Pilih ${contactLabel.toLowerCase()}.`);
    if (items.length === 0) return setError("Tambahkan minimal satu item.");

    const fd = new FormData();
    if (initial) fd.set("id", initial.id);
    fd.set("contact_id", contactId);
    fd.set("date", date);
    fd.set("due_date", dueDate);
    fd.set("notes", notes);
    fd.set("status", initial?.status ?? "unpaid");
    fd.set("items", JSON.stringify(items));

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
                  <th className="pb-2 px-2 text-right font-semibold">Qty</th>
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
                        value={r.product_id ?? ""}
                        onChange={(e) => pickProduct(r.key, e.target.value)}
                      >
                        <option value="">— Produk / manual —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
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
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        className="h-9 w-32 text-right"
                        type="number"
                        step="any"
                        min="0"
                        value={r.unit_price}
                        onChange={(e) =>
                          update(r.key, { unit_price: Number(e.target.value) })
                        }
                      />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan Nota"}
        </Button>
      </div>
    </form>
  );
}
