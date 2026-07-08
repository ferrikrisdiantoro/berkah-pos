import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InvoiceEditor, type InvoiceInitial } from "@/components/invoice-editor";
import { saveSaleAction } from "@/lib/actions/sales";
import { getConsignmentOptions } from "@/lib/consignment-options";
import type { Contact, DocItem, Product, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, { data: contacts }, { data: products }, consignments] =
    await Promise.all([
      supabase.from("sales").select("*, items:sale_items(*)").eq("id", id).single(),
      supabase
        .from("contacts")
        .select("*")
        .eq("is_active", true)
        .in("type", ["customer", "both"])
        .order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      getConsignmentOptions(),
    ]);

  if (!sale) notFound();
  const s = sale as unknown as Sale & { items: DocItem[] };

  const initial: InvoiceInitial = {
    id: s.id,
    contact_id: s.contact_id,
    date: s.date,
    due_date: s.due_date,
    notes: s.notes,
    status: s.status,
    items: [...(s.items ?? [])].sort((a, b) => a.position - b.position),
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit Nota ${s.number}`} />
      <InvoiceEditor
        kind="sale"
        contacts={(contacts ?? []) as Contact[]}
        products={(products ?? []) as Product[]}
        action={saveSaleAction}
        initial={initial}
        consignments={consignments}
      />
    </div>
  );
}
