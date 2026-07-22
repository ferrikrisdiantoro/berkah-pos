"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fileToResizedDataUrl } from "@/lib/image-resize";

/**
 * Upload gambar/logo untuk nota. Gambar di-resize di browser (maks 400px) lalu
 * disimpan sebagai data URI di kolom logo_url — tak perlu storage terpisah.
 * Nilai dikirim lewat hidden input "logo_url" dalam form Data Usaha.
 */
export function LogoUpload({ initial }: { initial: string | null }) {
  const [dataUrl, setDataUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setDataUrl(await fileToResizedDataUrl(file, 400, 0.85));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Label>Logo / Gambar Nota</Label>
      <input type="hidden" name="logo_url" value={dataUrl} />
      <div className="flex items-center gap-3">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="Logo"
            className="h-20 w-20 rounded-md border border-border object-contain"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            Belum ada
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" /> {busy ? "Memproses…" : "Pilih Gambar"}
          </Button>
          {dataUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDataUrl("")}
            >
              <X className="h-4 w-4" /> Hapus Gambar
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Gambar ini tampil di atas nota &amp; struk. Otomatis diperkecil agar ringan.
      </p>
    </div>
  );
}
