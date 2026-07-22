import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contact-form";
import { ContactDebtLedger, type DebtEntry } from "@/components/contact-debt-ledger";
import { DeleteButton } from "@/components/delete-button";
import { deleteContactAction } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: entries }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).single(),
    supabase
      .from("contact_debt_entries")
      .select("id, date, amount, note")
      .eq("contact_id", id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const contact = data as Contact;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit Kontak" subtitle={contact.name}>
        <div className="flex items-center gap-2">
          {(contact.type === "supplier" || contact.type === "both") && (
            <Link href={`/rekap-vendor?jenis=beli&contact=${contact.id}`}>
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" /> Rekap Pembelian
              </Button>
            </Link>
          )}
          {(contact.type === "customer" || contact.type === "both") && (
            <Link href={`/rekap-vendor?jenis=jual&contact=${contact.id}`}>
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" /> Rekap Penjualan
              </Button>
            </Link>
          )}
          <DeleteButton
            action={deleteContactAction}
            id={contact.id}
            redirectTo="/kontak"
            confirmText={`Hapus kontak "${contact.name}"?`}
          />
        </div>
      </PageHeader>
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="pt-5">
            <ContactForm contact={contact} />
          </CardContent>
        </Card>
        <ContactDebtLedger
          contactId={contact.id}
          balance={Number(contact.manual_debt_balance ?? 0)}
          entries={(entries ?? []) as DebtEntry[]}
        />
      </div>
    </div>
  );
}
