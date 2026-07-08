import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConsignmentForm } from "@/components/consignment-form";
import type { Contact, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewConsignmentPage() {
  const supabase = await createClient();
  const [{ data: owners }, { data: products }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("is_active", true)
      .in("type", ["supplier", "both"])
      .order("name"),
    supabase
      .from("products")
      .select("*, unit:units(name)")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Terima Barang Titipan" subtitle="Catat barang milik orang untuk dijualkan (konsinyasi)." />
      <Card>
        <CardContent className="pt-5">
          <ConsignmentForm
            owners={(owners ?? []) as Contact[]}
            products={(products ?? []) as Product[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
