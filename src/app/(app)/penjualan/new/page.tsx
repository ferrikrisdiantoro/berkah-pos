import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InvoiceEditor } from "@/components/invoice-editor";
import { saveSaleAction } from "@/lib/actions/sales";
import { getConsignmentOptions } from "@/lib/consignment-options";
import type { Contact, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const supabase = await createClient();
  const [{ data: contacts }, { data: products }, consignments] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("is_active", true)
      .in("type", ["customer", "both"])
      .order("name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    getConsignmentOptions(),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Nota Penjualan Baru" />
      <InvoiceEditor
        kind="sale"
        contacts={(contacts ?? []) as Contact[]}
        products={(products ?? []) as Product[]}
        action={saveSaleAction}
        consignments={consignments}
      />
    </div>
  );
}
