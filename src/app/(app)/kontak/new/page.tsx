import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";

export default function NewContactPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Tambah Kontak" />
      <Card>
        <CardContent className="pt-5">
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
