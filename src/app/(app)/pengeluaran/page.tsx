import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addCashEntryAction, deleteCashEntryAction } from "@/lib/actions/cash";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Kategori pengeluaran operasional harian
const KATEGORI = [
  "Es Batu",
  "Bensin / Transport",
  "Makan / Konsumsi",
  "Gaji / Upah",
  "Plastik / Kemasan",
  "Listrik / Air",
  "Perbaikan / Alat",
  "Lain-lain",
];

type Entry = {
  id: string;
  entry_date: string;
  category: string;
  description: string | null;
  amount: number;
  ref_type: string | null;
};

export default async function PengeluaranPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_ledger")
    .select("*")
    .eq("direction", "out")
    .eq("ref_type", "manual")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Entry[];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const today = todayISO();
  const totalHariIni = rows
    .filter((r) => r.entry_date === today)
    .reduce((s, r) => s + Number(r.amount), 0);

  const bulanIni = today.slice(0, 7);
  const totalBulanIni = rows
    .filter((r) => r.entry_date.startsWith(bulanIni))
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Pengeluaran Harian"
        subtitle="Biaya operasional (es, bensin, makan, dll). Tidak masuk penjualan — otomatis tercatat di Buku Kas."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Hari Ini" value={formatRupiah(totalHariIni)} />
        <SummaryCard label="Bulan Ini" value={formatRupiah(totalBulanIni)} />
        <SummaryCard label="Total Tercatat" value={formatRupiah(total)} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Catat Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addCashEntryAction} className="grid gap-3 sm:grid-cols-4">
            {/* Selalu kas keluar */}
            <input type="hidden" name="direction" value="out" />
            <input type="hidden" name="redirect_to" value="/pengeluaran" />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry_date">Tanggal</Label>
              <Input id="entry_date" name="entry_date" type="date" defaultValue={today} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Untuk apa?</Label>
              <Select id="category" name="category" defaultValue="Es Batu">
                {KATEGORI.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Nominal</Label>
              <MoneyInput id="amount" name="amount" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Simpan
              </Button>
            </div>
            <div className="sm:col-span-4">
              <Input name="description" placeholder="Keterangan (opsional) — mis. es 5 balok" />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada pengeluaran tercatat.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Badge tone="muted">{r.category}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatTanggal(r.entry_date)}
                      {r.description ? ` · ${r.description}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-destructive">
                      − {formatRupiah(r.amount)}
                    </span>
                    <form action={deleteCashEntryAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button variant="ghost" size="icon" type="submit" aria-label="Hapus">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </form>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-destructive">{value}</p>
      </CardContent>
    </Card>
  );
}
