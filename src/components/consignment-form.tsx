"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveConsignmentAction } from "@/lib/actions/consignments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/lib/utils";
import type { Contact, Product } from "@/lib/types";

export function ConsignmentForm({
  owners,
  products,
}: {
  owners: Contact[];
  products: Product[];
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) =>
      (await saveConsignmentAction(fd)) ?? null,
    null,
  );
  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const [productName, setProductName] = useState("");
  const [unit, setUnit] = useState("");
  const [productId, setProductId] = useState("");

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setProductName(p.name);
      setUnit(p.unit?.name ?? "");
    }
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_id">Pemilik Barang</Label>
        <Select id="owner_id" name="owner_id" required>
          <option value="">— Pilih pemilik —</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.city ? ` — ${o.city}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="received_date">Tanggal Terima</Label>
        <Input id="received_date" name="received_date" type="date" defaultValue={todayISO()} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product_pick">Ambil dari Produk (opsional)</Label>
        <Select id="product_pick" value={productId} onChange={(e) => pickProduct(e.target.value)}>
          <option value="">— Ketik manual —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <input type="hidden" name="product_id" value={productId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product_name">Nama Barang</Label>
        <Input
          id="product_name"
          name="product_name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="mis. Bandeng"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qty_in">Jumlah Titip</Label>
        <Input id="qty_in" name="qty_in" type="number" step="any" min="0" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit">Satuan</Label>
        <Input id="unit" name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Kg" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="base_price">Harga Titip / Acuan (opsional)</Label>
        <Input id="base_price" name="base_price" type="number" step="any" min="0" defaultValue={0} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commission_type">Jenis Komisi</Label>
          <Select id="commission_type" name="commission_type" defaultValue="percent">
            <option value="percent">Persen (%)</option>
            <option value="fixed_per_unit">Per satuan (Rp)</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commission_value">Nilai Komisi</Label>
          <Input id="commission_value" name="commission_value" type="number" step="any" min="0" defaultValue={0} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan Titipan"}
        </Button>
      </div>
    </form>
  );
}
