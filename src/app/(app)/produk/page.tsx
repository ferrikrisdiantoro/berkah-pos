import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  code: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  track_stock: boolean;
  unit: { name: string } | { name: string }[] | null;
};

export default async function ProdukPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, code, buy_price, sell_price, stock, min_stock, track_stock, unit:units(name)")
    .eq("is_active", true)
    .order("name");
  const products = (data ?? []) as Row[];

  const unitName = (u: Row["unit"]) =>
    Array.isArray(u) ? u[0]?.name : u?.name;

  return (
    <div>
      <PageHeader title="Produk" subtitle="Master produk & stok.">
        <Link href="/produk/new">
          <Button>
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
        </Link>
      </PageHeader>

      <Card>
        {products.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Belum ada produk.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH className="text-right">Harga Beli</TH>
                <TH className="text-right">Harga Jual</TH>
                <TH className="text-right">Stok</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {products.map((p) => {
                const stock = Number(p.stock);
                const minStock = Number(p.min_stock);
                const unit = unitName(p.unit) ?? "";
                const habis = p.track_stock && stock <= 0;
                const menipis =
                  p.track_stock && !habis && minStock > 0 && stock <= minStock;
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="font-medium">{p.name}</div>
                      {p.code && (
                        <div className="text-xs text-muted-foreground">{p.code}</div>
                      )}
                    </TD>
                    <TD className="text-right">{formatRupiah(p.buy_price)}</TD>
                    <TD className="text-right">{formatRupiah(p.sell_price)}</TD>
                    <TD className="text-right">
                      {p.track_stock ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-2">
                            {formatNumber(stock)} {unit}
                            {habis && <Badge tone="danger">Habis</Badge>}
                            {menipis && <Badge tone="warning">Menipis</Badge>}
                          </span>
                          {minStock > 0 && (
                            <span className="text-xs text-muted-foreground">
                              min {formatNumber(minStock)} {unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      <Link href={`/produk/${p.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
