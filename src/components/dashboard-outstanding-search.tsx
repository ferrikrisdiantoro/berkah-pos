"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";

export interface OutstandingParty {
  name: string;
  kind: "piutang" | "hutang"; // piutang = pelanggan belum bayar; hutang = kita belum bayar supplier
  amount: number;
}

/** Cari pelanggan/distributor yang masih punya tunggakan. */
export function DashboardOutstandingSearch({ parties }: { parties: OutstandingParty[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? parties.filter((p) => p.name.toLowerCase().includes(s)) : parties;
    return list.sort((a, b) => b.amount - a.amount).slice(0, 12);
  }, [q, parties]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tunggakan (Belum Lunas)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama pelanggan / distributor…"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-3 divide-y divide-border">
          {parties.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada tunggakan. 🎉
            </p>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ditemukan.</p>
          ) : (
            results.map((p, i) => (
              <Link
                key={`${p.kind}-${p.name}-${i}`}
                href={
                  p.kind === "piutang"
                    ? `/penjualan?q=${encodeURIComponent(p.name)}`
                    : `/pembelian?q=${encodeURIComponent(p.name)}`
                }
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <Badge tone={p.kind === "piutang" ? "warning" : "danger"}>
                    {p.kind === "piutang" ? "Piutang (pelanggan)" : "Hutang (ke supplier)"}
                  </Badge>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatRupiah(p.amount)}</span>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
