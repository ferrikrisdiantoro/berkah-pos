import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordOwnerPaymentAction } from "@/lib/actions/owners";
import { formatRupiah, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HakPemilikPage() {
  const supabase = await createClient();
  const [itemsRes, paysRes, contactsRes] = await Promise.all([
    supabase.from("sale_items").select("owner_id, owner_amount").not("owner_id", "is", null),
    supabase.from("owner_payments").select("owner_id, amount"),
    supabase.from("contacts").select("id, name"),
  ]);

  const nameById = new Map<string, string>();
  for (const c of contactsRes.data ?? []) nameById.set(c.id, c.name);

  const accrued = new Map<string, number>();
  for (const it of itemsRes.data ?? []) {
    if (!it.owner_id) continue;
    accrued.set(it.owner_id, (accrued.get(it.owner_id) ?? 0) + Number(it.owner_amount));
  }
  const paid = new Map<string, number>();
  for (const p of paysRes.data ?? []) {
    if (!p.owner_id) continue;
    paid.set(p.owner_id, (paid.get(p.owner_id) ?? 0) + Number(p.amount));
  }

  const owners = [...accrued.entries()]
    .map(([id, total]) => ({
      id,
      name: nameById.get(id) ?? "—",
      total,
      paid: paid.get(id) ?? 0,
      sisa: total - (paid.get(id) ?? 0),
    }))
    .sort((a, b) => b.sisa - a.sisa);

  const totalSisa = owners.reduce((s, o) => s + Math.max(0, o.sisa), 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Hak Pemilik Barang"
        subtitle="Bagian pemilik dari penjualan barang titipan, dikurangi yang sudah dibayar."
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">Total belum dibayar ke pemilik</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{formatRupiah(totalSisa)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per Pemilik</CardTitle>
        </CardHeader>
        <CardContent>
          {owners.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada penjualan barang titipan.
            </p>
          ) : (
            <div className="space-y-3">
              {owners.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Hak: {formatRupiah(o.total)} · Terbayar: {formatRupiah(o.paid)}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">
                      Sisa: {formatRupiah(Math.max(0, o.sisa))}
                    </div>
                  </div>
                  {o.sisa > 0 && (
                    <form
                      action={recordOwnerPaymentAction}
                      className="flex items-end gap-2"
                    >
                      <input type="hidden" name="owner_id" value={o.id} />
                      <input type="hidden" name="date" value={todayISO()} />
                      <Input
                        name="amount"
                        type="number"
                        step="any"
                        min="0"
                        defaultValue={Math.max(0, o.sisa)}
                        className="h-9 w-36 text-right"
                      />
                      <Button type="submit" size="sm">
                        Bayar
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
