import Link from "next/link";
import { ShoppingCart, Receipt, Package, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DashboardProductSearch,
  type DashProduct,
} from "@/components/dashboard-product-search";
import {
  DashboardOutstandingSearch,
  type OutstandingParty,
} from "@/components/dashboard-outstanding-search";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, type DocStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [purchasesRes, salesRes, productsRes, recentRes] = await Promise.all([
    supabase.from("purchases").select("total, paid_total, status, contact:contacts(name)"),
    supabase.from("sales").select("total, paid_total, status, contact:contacts(name)"),
    supabase
      .from("products")
      .select("id, name, stock, min_stock, track_stock, is_active, sell_price, unit:units(name)")
      .order("name"),
    supabase
      .from("purchases")
      .select("id, number, date, total, status, contact:contacts(name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const purchases = purchasesRes.data ?? [];
  const sales = salesRes.data ?? [];
  const products = productsRes.data ?? [];

  const hutang = purchases
    .filter((p) => p.status !== "paid" && p.status !== "draft")
    .reduce((s, p) => s + (Number(p.total) - Number(p.paid_total)), 0);
  const piutang = sales
    .filter((s) => s.status !== "paid" && s.status !== "draft")
    .reduce((sum, s) => sum + (Number(s.total) - Number(s.paid_total)), 0);
  const lowStock = products.filter((p) => {
    if (!p.is_active || !p.track_stock) return false;
    const stock = Number(p.stock);
    const minStock = Number(p.min_stock);
    return stock <= 0 || (minStock > 0 && stock <= minStock);
  }).length;

  // Daftar pihak yang masih nunggak (untuk pencarian di dashboard).
  const nameOfC = (c: unknown) => {
    const o = c as { name?: string } | { name?: string }[] | null;
    return (Array.isArray(o) ? o[0]?.name : o?.name) ?? "—";
  };
  const outParties: OutstandingParty[] = [];
  const piutangMap = new Map<string, number>();
  for (const s of sales) {
    if (s.status === "paid" || s.status === "draft") continue;
    const sisa = Number(s.total) - Number(s.paid_total);
    if (sisa <= 0) continue;
    const n = nameOfC(s.contact);
    piutangMap.set(n, (piutangMap.get(n) ?? 0) + sisa);
  }
  for (const [name, amount] of piutangMap) outParties.push({ name, kind: "piutang", amount });
  const hutangMap = new Map<string, number>();
  for (const p of purchases) {
    if (p.status === "paid" || p.status === "draft") continue;
    const sisa = Number(p.total) - Number(p.paid_total);
    if (sisa <= 0) continue;
    const n = nameOfC(p.contact);
    hutangMap.set(n, (hutangMap.get(n) ?? 0) + sisa);
  }
  for (const [name, amount] of hutangMap) outParties.push({ name, kind: "hutang", amount });

  const stats = [
    {
      label: "Hutang Pembelian",
      value: formatRupiah(hutang),
      sub: `${purchases.length} nota pembelian`,
      icon: ShoppingCart,
      href: "/pembelian",
      chip: "bg-rose-100 text-rose-600",
      ring: "hover:border-rose-200",
    },
    {
      label: "Piutang Penjualan",
      value: formatRupiah(piutang),
      sub: `${sales.length} nota penjualan`,
      icon: Receipt,
      href: "/penjualan",
      chip: "bg-emerald-100 text-emerald-600",
      ring: "hover:border-emerald-200",
    },
    {
      label: "Produk Aktif",
      value: String(products.filter((p) => p.is_active).length),
      sub: "master produk",
      icon: Package,
      href: "/produk",
      chip: "bg-blue-100 text-blue-600",
      ring: "hover:border-blue-200",
    },
    {
      label: "Perlu Restok",
      value: String(lowStock),
      sub: "habis / di bawah minimum",
      icon: TriangleAlert,
      href: "/produk",
      chip: "bg-amber-100 text-amber-600",
      ring: "hover:border-amber-200",
    },
  ];

  const recent = recentRes.data ?? [];

  // Data untuk pencarian produk cepat (#2)
  const searchProducts: DashProduct[] = products
    .filter((p) => p.is_active)
    .map((p) => {
      const u = (p as { unit?: { name?: string } | { name?: string }[] | null }).unit;
      return {
        id: p.id,
        name: (p as { name: string }).name,
        stock: Number(p.stock),
        minStock: Number(p.min_stock),
        trackStock: !!p.track_stock,
        sellPrice: Number((p as { sell_price?: number }).sell_price ?? 0),
        unit: (Array.isArray(u) ? u[0]?.name : u?.name) ?? "",
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Selamat datang 👋</h1>
        <p className="mt-1 text-sm text-white/85">
          Ringkasan aktivitas WL Pemburu Bandeng hari ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className={`transition-all hover:shadow-md ${s.ring}`}>
              <CardContent className="flex items-start justify-between pt-5">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.chip}`}>
                  <s.icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardProductSearch products={searchProducts} />
        <DashboardOutstandingSearch parties={outParties} />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Pembelian Terakhir</h2>
            <Link href="/pembelian" className="text-sm text-primary hover:underline">
              Lihat semua
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada transaksi pembelian.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((p) => {
                const contact = p.contact as { name?: string } | { name?: string }[] | null;
                const name = Array.isArray(contact) ? contact[0]?.name : contact?.name;
                return (
                  <Link
                    key={p.id}
                    href={`/pembelian/${p.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/40"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {name ?? "—"} · {formatTanggal(p.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatRupiah(p.total)}</span>
                      <Badge tone={STATUS_TONE[p.status as DocStatus]}>
                        {STATUS_LABEL[p.status as DocStatus]}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
