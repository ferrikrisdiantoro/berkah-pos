"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveContactAction } from "@/lib/actions/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CONTACT_CATEGORIES, type Contact } from "@/lib/types";

export function ContactForm({ contact }: { contact?: Contact }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) =>
      saveContactAction(fd),
    null,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Tipe</Label>
        <Select id="type" name="type" defaultValue={contact?.type ?? "supplier"}>
          <option value="supplier">Supplier</option>
          <option value="customer">Pelanggan</option>
          <option value="both">Supplier &amp; Pelanggan</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Kategori</Label>
        <Select id="category" name="category" defaultValue={contact?.category ?? ""}>
          <option value="">— Pilih kategori —</option>
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" name="name" defaultValue={contact?.name ?? ""} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Kota</Label>
        <Input id="city" name="city" defaultValue={contact?.city ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telepon</Label>
        <Input id="phone" name="phone" defaultValue={contact?.phone ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" name="address" defaultValue={contact?.address ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={contact?.notes ?? ""}
          placeholder="mis. biasa setor pagi, harga nego, dll."
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
