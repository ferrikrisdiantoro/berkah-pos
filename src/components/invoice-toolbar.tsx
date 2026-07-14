"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, Share2, Pencil, Check, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InvoiceToolbar({
  editHref,
  shareUrl,
  strukHref,
  imageUrl,
  caption,
}: {
  editHref: string;
  shareUrl: string;
  strukHref: string;
  imageUrl: string;
  caption: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin tautan nota:", shareUrl);
    }
  }

  /** Bagikan gambar struk + link (WhatsApp dsb). Fallback: salin link. */
  async function share() {
    setBusy(true);
    try {
      const text = `${caption}\n${shareUrl}`;
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("gagal ambil gambar");
      const blob = await res.blob();
      const file = new File([blob], "nota.png", { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return;
      }
      // Perangkat tak mendukung kirim file -> bagikan teks + link saja.
      if (nav.share) {
        await nav.share({ text });
        return;
      }
      await copyLink();
      toast.info("Tautan disalin (perangkat ini tak mendukung kirim gambar).");
    } catch {
      await copyLink();
      toast.info("Tautan disalin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={share} disabled={busy}>
        {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
        {busy ? "Menyiapkan…" : copied ? "Tersalin" : "Bagikan"}
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
