import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateBusinessAction,
  addBankAccountAction,
  deleteBankAccountAction,
} from "@/lib/actions/settings";
import type { BankAccount, BusinessSettings } from "@/lib/types";

import { requireMaster } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  await requireMaster();
  const supabase = await createClient();
  const [{ data: biz }, { data: accounts }] = await Promise.all([
    supabase.from("business_settings").select("*").eq("id", 1).single(),
    supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at"),
  ]);

  const b = (biz ?? {}) as Partial<BusinessSettings>;
  const banks = (accounts ?? []) as BankAccount[];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Data usaha & rekening yang tampil di nota.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Usaha</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateBusinessAction} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Nama Usaha</Label>
              <Input id="name" name="name" defaultValue={b.name ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea id="address" name="address" defaultValue={b.address ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" name="phone" defaultValue={b.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={b.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="footer_note">Catatan Kaki Nota</Label>
              <Textarea
                id="footer_note"
                name="footer_note"
                defaultValue={b.footer_note ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekening / Kas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {banks.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {banks.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {acc.name}
                      {acc.is_cash && <Badge tone="muted">Kas</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[acc.account_number, acc.holder].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <form action={deleteBankAccountAction}>
                    <input type="hidden" name="id" value={acc.id} />
                    <Button variant="ghost" size="icon" type="submit" aria-label="Hapus">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addBankAccountAction} className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-name">Nama Rekening</Label>
              <Input id="acc-name" name="name" placeholder="Rekening BRI" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-no">No. Rekening</Label>
              <Input id="acc-no" name="account_number" placeholder="1234-5678" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-holder">Atas Nama</Label>
              <Input id="acc-holder" name="holder" />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="is_cash" className="h-4 w-4" />
              Rekening kas tunai
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary">
                Tambah Rekening
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
