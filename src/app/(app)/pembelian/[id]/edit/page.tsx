import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InvoiceEditor, type InvoiceInitial } from "@/components/invoice-editor";
import { savePurchaseAction } from "@/lib/actions/purchases";
import type { Contact, DocItem, Product, Purchase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: purchase }, { data: contacts }, { data: products }] = await Promise.all([
    supabase
      .from("purchases")
      .select("*, items:purchase_items(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("contacts")
      .select("*")
      .eq("is_active", true)
      .in("type", ["supplier", "both"])
      .order("name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
  ]);

  if (!purchase) notFound();
  const p = purchase as unknown as Purchase & { items: DocItem[] };

  const initial: InvoiceInitial = {
    id: p.id,
    contact_id: p.contact_id,
    date: p.date,
    due_date: p.due_date,
    notes: p.notes,
    status: p.status,
    items: [...(p.items ?? [])].sort((a, b) => a.position - b.position),
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit Nota ${p.number}`} />
      <InvoiceEditor
        kind="purchase"
        contacts={(contacts ?? []) as Contact[]}
        products={(products ?? []) as Product[]}
        action={savePurchaseAction}
        initial={initial}
      />
    </div>
  );
}
