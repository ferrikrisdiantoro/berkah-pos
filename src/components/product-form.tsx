"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveProductAction } from "@/lib/actions/products";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Product, Unit } from "@/lib/types";

export function ProductForm({
  product,
  units,
  unitName,
}: {
  product?: Product;
  units: Unit[];
  unitName?: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) =>
      saveProductAction(fd),
    null,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Nama Produk</Label>
        <Input id="name" name="name" defaultValue={product?.name ?? ""} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Kode (opsional)</Label>
        <Input id="code" name="code" defaultValue={product?.code ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit">Satuan</Label>
        <Input
          id="unit"
          name="unit"
          list="unit-list"
          placeholder="Kg"
          defaultValue={unitName ?? ""}
        />
        <datalist id="unit-list">
          {units.map((u) => (
            <option key={u.id} value={u.name} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="buy_price">Harga Beli</Label>
        <Input
          id="buy_price"
          name="buy_price"
          type="number"
          min="0"
          step="any"
          defaultValue={product?.buy_price ?? 0}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sell_price">Harga Jual</Label>
        <Input
          id="sell_price"
          name="sell_price"
          type="number"
          min="0"
          step="any"
          defaultValue={product?.sell_price ?? 0}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="track_stock"
          name="track_stock"
          type="checkbox"
          className="h-4 w-4"
          defaultChecked={product?.track_stock ?? true}
        />
        <Label htmlFor="track_stock">Kelola stok produk ini</Label>
      </div>
      {!product && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock">Stok Awal</Label>
          <Input id="stock" name="stock" type="number" step="any" defaultValue={0} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="min_stock">Stok Minimum</Label>
        <Input
          id="min_stock"
          name="min_stock"
          type="number"
          step="any"
          defaultValue={product?.min_stock ?? 0}
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
