"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatNumber } from "@/lib/utils";

export interface DashProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  trackStock: boolean;
  sellPrice: number;
  unit: string;
}

/** Pencarian cepat produk di dashboard — cek stok & harga tanpa pindah halaman. */
export function DashboardProductSearch({ products }: { products: DashProduct[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, products]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cari Produk</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ketik nama ikan… (mis. bandeng)"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {q.trim() && (
          <div className="mt-3 divide-y divide-border">
            {results.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Produk tidak ditemukan.
              </p>
            ) : (
              results.map((p) => {
                const habis = p.trackStock && p.stock <= 0;
                const menipis =
                  p.trackStock && !habis && p.minStock > 0 && p.stock <= p.minStock;
                return (
                  <Link
                    key={p.id}
                    href={`/produk/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Jual {formatRupiah(p.sellPrice)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm">
                        {p.trackStock ? `${formatNumber(p.stock)} ${p.unit}` : "—"}
                      </span>
                      {habis && <Badge tone="danger">Habis</Badge>}
                      {menipis && <Badge tone="warning">Menipis</Badge>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
