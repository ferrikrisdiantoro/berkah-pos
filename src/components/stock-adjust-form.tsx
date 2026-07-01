"use client";

import { useActionState } from "react";
import { adjustStockAction } from "@/lib/actions/products";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

export function StockAdjustForm({
  productId,
  currentStock,
  unit,
}: {
  productId: string;
  currentStock: number;
  unit: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, fd: FormData) =>
      (await adjustStockAction(fd)) ?? null,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="product_id" value={productId} />
      <div className="text-sm text-muted-foreground">
        Stok saat ini:{" "}
        <span className="font-semibold text-foreground">
          {formatNumber(currentStock)} {unit}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="actual">Stok aktual (hasil hitung fisik)</Label>
        <Input id="actual" name="actual" type="number" step="any" min="0" placeholder={String(currentStock)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Input id="note" name="note" placeholder="mis. opname bulanan" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Stok disesuaikan.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Menyimpan…" : "Sesuaikan Stok"}
      </Button>
    </form>
  );
}
