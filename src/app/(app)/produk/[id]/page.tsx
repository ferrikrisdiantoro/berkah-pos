import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/product-form";
import { StockAdjustForm } from "@/components/stock-adjust-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteProductAction } from "@/lib/actions/products";
import type { Product, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: units }] = await Promise.all([
    supabase.from("products").select("*, unit:units(name)").eq("id", id).single(),
    supabase.from("units").select("*").order("name"),
  ]);
  if (!product) notFound();

  const p = product as Product & { unit: { name: string } | { name: string }[] | null };
  const unitName = Array.isArray(p.unit) ? p.unit[0]?.name : p.unit?.name;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Edit Produk" subtitle={p.name}>
        <DeleteButton
          action={deleteProductAction}
          id={p.id}
          redirectTo="/produk"
          confirmText={`Nonaktifkan produk "${p.name}"?`}
        />
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="pt-5">
            <ProductForm
              product={p}
              units={(units ?? []) as Unit[]}
              unitName={unitName ?? ""}
            />
          </CardContent>
        </Card>
        {p.track_stock && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Penyesuaian Stok (Opname)</CardTitle>
            </CardHeader>
            <CardContent>
              <StockAdjustForm
                productId={p.id}
                currentStock={Number(p.stock)}
                unit={unitName ?? ""}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
