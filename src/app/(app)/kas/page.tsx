import { Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { requireMaster } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { addCashEntryAction, deleteCashEntryAction } from "@/lib/actions/cash";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  entry_date: string;
  direction: "in" | "out";
  category: string;
  description: string | null;
  amount: number;
  ref_type: string | null;
};

export default async function KasPage() {
  await requireMaster();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_ledger")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Entry[];

  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + Number(r.amount), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Buku Kas" subtitle="Kas masuk & keluar (200 transaksi terakhir)." />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Kas Masuk" value={formatRupiah(totalIn)} tone="text-success" />
        <SummaryCard label="Kas Keluar" value={formatRupiah(totalOut)} tone="text-destructive" />
        <SummaryCard label="Saldo Kas" value={formatRupiah(balance)} tone="text-primary" />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Catat Kas Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addCashEntryAction} className="grid gap-3 sm:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry_date">Tanggal</Label>
              <Input id="entry_date" name="entry_date" type="date" defaultValue={todayISO()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direction">Jenis</Label>
              <Select id="direction" name="direction" defaultValue="out">
                <option value="in">Masuk</option>
                <option value="out">Keluar</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" name="category" placeholder="mis. Operasional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Nominal</Label>
              <Input id="amount" name="amount" type="number" step="any" min="0" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Simpan</Button>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-5">
              <Input name="description" placeholder="Keterangan (opsional)" />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kas</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi kas.</p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    {r.direction === "in" ? (
                      <ArrowDownCircle className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{r.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTanggal(r.entry_date)}
                        {r.description ? ` · ${r.description}` : ""}
                        {r.ref_type !== "manual" ? " · otomatis" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${r.direction === "in" ? "text-success" : "text-destructive"}`}
                    >
                      {r.direction === "in" ? "+" : "−"} {formatRupiah(r.amount)}
                    </span>
                    {r.ref_type === "manual" && (
                      <form action={deleteCashEntryAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="icon" type="submit" aria-label="Hapus">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
