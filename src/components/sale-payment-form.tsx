"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { addSalePaymentAction } from "@/lib/actions/sales";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatRupiah, todayISO } from "@/lib/utils";
import type { BankAccount } from "@/lib/types";

export interface PayableItem {
  id: string;
  description: string;
  lineTotal: number;
  paid: number;
  outstanding: number;
}

export function SalePaymentForm({
  saleId,
  accounts,
  items,
  remaining,
}: {
  saleId: string;
  accounts: BankAccount[];
  items: PayableItem[];
  remaining: number;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, fd: FormData) =>
      (await addSalePaymentAction(fd)) ?? null,
    null,
  );

  const payable = items.filter((i) => i.outstanding > 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState<number>(remaining > 0 ? remaining : 0);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Pembayaran tersimpan");
      // Reset supaya tidak terbawa nominal lama (cegah dobel bayar).
      setSelected([]);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  // Ikuti sisa tagihan terbaru setelah pembayaran tersimpan.
  useEffect(() => {
    setAmount(remaining > 0 ? remaining : 0);
  }, [remaining]);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSelected(next);
    // Nominal otomatis = jumlah sisa item terpilih (tetap bisa diubah untuk DP).
    const sum = payable
      .filter((i) => next.includes(i.id))
      .reduce((s, i) => s + i.outstanding, 0);
    setAmount(next.length > 0 ? sum : remaining > 0 ? remaining : 0);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="sale_id" value={saleId} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="item_ids" value={id} />
      ))}

      {payable.length > 0 && (
        <div className="rounded-md border border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Pilih item yang dibayar duluan (opsional — kosongkan untuk DP umum):
          </p>
          <div className="flex flex-col gap-2">
            {payable.map((i) => (
              <label key={i.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.includes(i.id)}
                  onChange={() => toggle(i.id)}
                />
                <span className="flex-1">
                  <span className="font-medium">{i.description}</span>
                  <span className="block text-xs text-muted-foreground">
                    sisa {formatRupiah(i.outstanding)}
                    {i.paid > 0 ? ` · terbayar ${formatRupiah(i.paid)}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-date">Tanggal</Label>
          <Input id="pay-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-amount">Nominal (bisa DP)</Label>
          <Input
            id="pay-amount"
            name="amount"
            type="number"
            step="any"
            min="0"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pay-account">Rekening / Kas</Label>
        <Select id="pay-account" name="account_id" defaultValue={accounts[0]?.id ?? ""}>
          <option value="">— Pilih —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Catat Pembayaran"}
      </Button>
    </form>
  );
}
