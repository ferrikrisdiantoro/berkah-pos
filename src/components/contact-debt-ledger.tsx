"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addDebtEntryAction, deleteDebtEntryAction } from "@/lib/actions/contact-debt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/utils";

export type DebtEntry = {
  id: string;
  date: string;
  amount: number;
  note: string | null;
};

/**
 * Saldo tunggakan lama (manual, di luar nota sistem) untuk satu kontak.
 * Sekali dicatat di sini, otomatis terbawa sebagai "Tunggakan Sebelumnya"
 * di nota baru kontak ini — tak perlu diketik ulang tiap nota. Kalau
 * dibayar sebagian, catat sebagai "Bayar" dan sisanya otomatis berkurang.
 */
export function ContactDebtLedger({
  contactId,
  balance,
  entries,
}: {
  contactId: string;
  balance: number;
  entries: DebtEntry[];
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, fd: FormData) =>
      (await addDebtEntryAction(fd)) ?? null,
    null,
  );
  const [kind, setKind] = useState<"tambah" | "bayar">("bayar");
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Tunggakan tersimpan");
      setAmount(0);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className={balance > 0 ? "border-amber-300" : undefined}>
      <CardHeader>
        <CardTitle className={balance > 0 ? "text-amber-700" : undefined}>
          Tunggakan Lama (Manual)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Untuk hutang lama yang belum masuk sistem. Saldo di sini otomatis
          jadi &quot;Tunggakan Sebelumnya&quot; tiap nota baru kontak ini —
          tidak perlu diketik ulang. Kalau dibayar sebagian, catat di bawah
          sebagai <b>Bayar</b>, sisanya otomatis ikut nota berikutnya.
        </p>

        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Saldo saat ini</div>
          <div className={`text-xl font-bold ${balance > 0 ? "text-amber-700" : ""}`}>
            {formatRupiah(balance)}
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="contact_id" value={contactId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="debt-kind">Jenis</Label>
              <Select
                id="debt-kind"
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as "tambah" | "bayar")}
              >
                <option value="bayar">Bayar (kurangi tunggakan)</option>
                <option value="tambah">Tambah tunggakan</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="debt-date">Tanggal</Label>
              <Input id="debt-date" name="date" type="date" defaultValue={todayISO()} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-amount">Nominal</Label>
            <MoneyInput
              id="debt-amount"
              name="amount"
              value={amount}
              onValueChange={setAmount}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-note">Catatan (opsional)</Label>
            <Input id="debt-note" name="note" placeholder="mis. dibayar tunai di rumah" />
          </div>
          <Button type="submit" disabled={pending || amount <= 0}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>

        {entries.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Riwayat
            </p>
            <div className="flex flex-col gap-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className={e.amount < 0 ? "text-success" : "text-amber-700"}>
                      {e.amount < 0 ? "− " : "+ "}
                      {formatRupiah(Math.abs(e.amount))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTanggal(e.date)}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <form action={deleteDebtEntryAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="contact_id" value={contactId} />
                    <Button variant="ghost" size="icon" type="submit" aria-label="Hapus">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
