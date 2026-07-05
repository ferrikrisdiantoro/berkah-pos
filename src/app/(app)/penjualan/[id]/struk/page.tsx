import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiptDocument } from "@/components/receipt-document";
import { ReceiptActions } from "@/components/receipt-actions";
import type { BusinessSettings, Contact, DocItem, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@page { size: 58mm auto; margin: 0; }
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .receipt-area { width: 58mm !important; padding: 3mm 2mm !important; margin: 0 !important; }
}
`;

export default async function StrukPenjualanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, { data: business }] = await Promise.all([
    supabase
      .from("sales")
      .select("*, contact:contacts(*), items:sale_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", 1).single(),
  ]);
  if (!sale) notFound();

  const s = sale as unknown as Sale & { contact: Contact | null; items: DocItem[] };
  const items = [...(s.items ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-muted">
      <style>{PRINT_CSS}</style>
      <ReceiptActions />
      <div className="mx-auto max-w-[58mm] bg-white shadow-sm">
        <ReceiptDocument
          business={business as BusinessSettings}
          doc={s}
          contact={s.contact}
          items={items}
          docType="sale"
        />
      </div>
    </div>
  );
}
