"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/lib/utils";
import type { BankAccount } from "@/lib/types";

type Action = (formData: FormData) => Promise<{ error?: string; ok?: boolean } | void>;

export function PaymentForm({
  action,
  docId,
  docField,
  accounts,
  remaining,
}: {
  action: Action;
  docId: string;
  docField: "purchase_id" | "sale_id";
  accounts: BankAccount[];
  remaining: number;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, fd: FormData) =>
      (await action(fd)) ?? null,
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Pembayaran tersimpan");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name={docField} value={docId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-date">Tanggal</Label>
          <Input id="pay-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-amount">Nominal</Label>
          <Input
            id="pay-amount"
            name="amount"
            type="number"
            step="any"
            min="0"
            defaultValue={remaining > 0 ? remaining : ""}
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
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Pembayaran tersimpan.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Catat Pembayaran"}
      </Button>
    </form>
  );
}
