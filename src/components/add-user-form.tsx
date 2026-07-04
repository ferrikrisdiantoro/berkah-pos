"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createUserAction } from "@/lib/actions/users";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AddUserForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) =>
      (await createUserAction(fd)) ?? null,
    null,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="u-name">Nama</Label>
        <Input id="u-name" name="full_name" placeholder="Nama staf" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="u-role">Peran</Label>
        <Select id="u-role" name="role" defaultValue="staff">
          <option value="staff">Staf (akses terbatas)</option>
          <option value="owner">Master (akses penuh)</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="u-email">Email</Label>
        <Input id="u-email" name="email" type="email" placeholder="staf@berkahmina.com" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="u-pass">Kata Sandi</Label>
        <Input id="u-pass" name="password" type="text" placeholder="min. 6 karakter" required />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Membuat…" : "Buat Akun"}
        </Button>
      </div>
    </form>
  );
}
