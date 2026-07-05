"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, Share2, Pencil, Check, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InvoiceToolbar({
  editHref,
  shareUrl,
  strukHref,
}: {
  editHref: string;
  shareUrl: string;
  strukHref: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin tautan nota:", shareUrl);
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={copyShare}>
        {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Tersalin" : "Bagikan"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print / PDF
      </Button>
      <Link href={strukHref}>
        <Button variant="outline" size="sm">
          <ReceiptText className="h-4 w-4" /> Struk 58mm
        </Button>
      </Link>
      <Link href={editHref}>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </Link>
    </div>
  );
}
