import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { supplier: "Supplier", customer: "Pelanggan", both: "Supplier & Pelanggan" };

export default async function KontakPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("is_active", true)
    .order("name");
  const contacts = (data ?? []) as Contact[];

  return (
    <div>
      <PageHeader title="Kontak" subtitle="Supplier & pelanggan.">
        <Link href="/kontak/new">
          <Button>
            <Plus className="h-4 w-4" /> Tambah Kontak
          </Button>
        </Link>
      </PageHeader>

      <Card>
        {contacts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Belum ada kontak.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Tipe</TH>
                <TH>Kota</TH>
                <TH>Telepon</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {contacts.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD>
                    <Badge tone="muted">{TYPE_LABEL[c.type]}</Badge>
                  </TD>
                  <TD>{c.city ?? "—"}</TD>
                  <TD>{c.phone ?? "—"}</TD>
                  <TD className="text-right">
                    <Link href={`/kontak/${c.id}`}>
                      <Button variant="ghost" size="icon" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
