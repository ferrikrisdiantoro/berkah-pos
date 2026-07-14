import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConsignmentForm } from "@/components/consignment-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteConsignmentAction } from "@/lib/actions/consignments";
import { formatNumber } from "@/lib/utils";
import type { Consignment, Contact, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditConsignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: consignment }, { data: owners }, { data: products }] = await Promise.all([
    supabase.from("consignments").select("*").eq("id", id).single(),
    supabase
      .from("contacts")
      .select("*")
      .eq("is_active", true)
      .in("type", ["supplier", "both"])
      .order("name"),
    supabase.from("products").select("*, unit:units(name)").eq("is_active", true).order("name"),
  ]);

  if (!consignment) notFound();
  const c = consignment as Consignment;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Edit Barang Titipan"
        subtitle={`${c.product_name} — sisa ${formatNumber(c.qty_remaining)} ${c.unit ?? ""}`}
      >
        <DeleteButton
          action={deleteConsignmentAction}
          id={c.id}
          redirectTo="/titipan"
          confirmText={`Hapus titipan "${c.product_name}"?`}
        />
      </PageHeader>
      <Card>
        <CardContent className="pt-5">
          <ConsignmentForm
            owners={(owners ?? []) as Contact[]}
            products={(products ?? []) as Product[]}
            consignment={c}
          />
        </CardContent>
      </Card>
    </div>
  );
}
