"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  id,
  redirectTo,
  confirmText = "Hapus data ini?",
  label = "Hapus",
}: {
  action: (formData: FormData) => Promise<unknown>;
  id: string;
  redirectTo?: string;
  confirmText?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(confirmText)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await action(fd);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
      className="text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Menghapus…" : label}
    </Button>
  );
}
