"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptActions({ autoPrint = false }: { autoPrint?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print mx-auto flex max-w-xs items-center justify-between gap-2 p-3">
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Cetak Struk
      </Button>
    </div>
  );
}
