"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/lib/utils";
import { fileToResizedDataUrl } from "@/lib/image-resize";
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
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Pembayaran tersimpan");
      setProofUrl("");
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  async function onProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setProofUrl(await fileToResizedDataUrl(file, 500, 0.8));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
          <MoneyInput
            id="pay-amount"
            name="amount"
            defaultValue={remaining > 0 ? remaining : 0}
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
      <div className="flex flex-col gap-1.5">
        <Label>Bukti Transfer (opsional)</Label>
        <input type="hidden" name="proof_url" value={proofUrl} />
        <div className="flex items-center gap-3">
          {proofUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofUrl}
              alt="Bukti transfer"
              className="h-16 w-16 rounded-md border border-border object-cover"
            />
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onProofFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Memproses…" : proofUrl ? "Ganti Foto" : "Lampirkan Foto"}
          </Button>
          {proofUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setProofUrl("")}>
              <X className="h-4 w-4" /> Hapus
            </Button>
          )}
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Pembayaran tersimpan.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Catat Pembayaran"}
      </Button>
    </form>
  );
}
