import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDocument, type InvoicePayment } from "@/components/invoice-document";
import { SharePrintButton } from "@/components/share-print-button";
import type { BusinessSettings, Contact, DocItem, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShareSalePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_sale", { p_token: token });

  if (!data || !data.sale) notFound();

  const doc = data.sale as Sale;
  const items = ((data.items ?? []) as DocItem[]).sort(
    (a, b) => a.position - b.position,
  );

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="no-print mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Nota Penjualan</span>
          <SharePrintButton />
        </div>
        <InvoiceDocument
          business={data.business as BusinessSettings}
          doc={doc}
          contact={data.contact as Contact}
          items={items}
          payments={(data.payments ?? []) as InvoicePayment[]}
          docType="sale"
        />
      </div>
    </main>
  );
}
