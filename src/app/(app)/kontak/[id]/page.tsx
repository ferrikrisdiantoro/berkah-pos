import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";
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
  const { data } = await supabase.from("contacts").select("*").eq("id", id).single();
  if (!data) notFound();
  const contact = data as Contact;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit Kontak" subtitle={contact.name}>
        <DeleteButton
          action={deleteContactAction}
          id={contact.id}
          redirectTo="/kontak"
          confirmText={`Hapus kontak "${contact.name}"?`}
        />
      </PageHeader>
      <Card>
        <CardContent className="pt-5">
          <ContactForm contact={contact} />
        </CardContent>
      </Card>
    </div>
  );
}
