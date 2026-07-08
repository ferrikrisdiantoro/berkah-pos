"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isNativeApp,
  buildReceiptText,
  printReceiptNative,
  type ReceiptData,
} from "@/lib/native-print";

export function NativePrintButton({ data }: { data: ReceiptData }) {
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);

  // Cek di client agar tak bentrok saat SSR.
  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  if (!native) return null;

  async function handlePrint() {
    setBusy(true);
    const res = await printReceiptNative(buildReceiptText(data));
    setBusy(false);
    if (res.ok) toast.success("Struk dikirim ke printer");
    else toast.error(res.error ?? "Gagal mencetak");
  }

  return (
    <Button onClick={handlePrint} disabled={busy}>
      <Bluetooth className="h-4 w-4" />
      {busy ? "Mencetak…" : "Cetak ke Printer"}
    </Button>
  );
}
