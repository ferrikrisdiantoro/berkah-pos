import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/product-form";
import type { Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("*").order("name");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Tambah Produk" />
      <Card>
        <CardContent className="pt-5">
          <ProductForm units={(data ?? []) as Unit[]} />
        </CardContent>
      </Card>
    </div>
  );
}
