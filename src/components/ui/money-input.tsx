"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input angka dengan pemisah ribuan otomatis (mis. ketik 25000 -> tampil 25.000).
 * Mencegah admin salah hitung jumlah nol. Nilai asli tetap angka polos
 * (dikirim lewat <input type="hidden" name=...>).
 */
export function MoneyInput({
  name,
  value,
  defaultValue,
  onValueChange,
  className,
  placeholder,
  required,
  id,
}: {
  name?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (v: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  // Format id-ID: titik = pemisah ribuan, koma = desimal.
  const format = (n: number | undefined) =>
    n === undefined || n === null || Number.isNaN(n) || n === 0
      ? ""
      : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

  /** "1.500,5" -> 1500.5 (JANGAN buang koma; itu desimal, bukan digit). */
  const parse = (s: string): number => {
    const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const [text, setText] = React.useState<string>(format(value ?? defaultValue));

  // Ikuti perubahan dari luar (mis. harga terisi otomatis saat pilih produk).
  React.useEffect(() => {
    if (value !== undefined) setText(format(value));
  }, [value]);

  const num = parse(text);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Izinkan angka + satu koma desimal.
    const only = raw.replace(/[^\d,]/g, "");
    const [intPart, ...rest] = only.split(",");
    const dec = rest.length > 0 ? "," + rest.join("").slice(0, 2) : "";
    const intNum = Number(intPart || "0");
    const grouped = intPart ? new Intl.NumberFormat("id-ID").format(intNum) : "";
    const next = grouped + dec;
    setText(next);
    onValueChange?.(parse(next));
  }

  return (
    <>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={handle}
        placeholder={placeholder ?? "0"}
        required={required}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-right tabular-nums",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          className,
        )}
      />
      {name && <input type="hidden" name={name} value={num} />}
    </>
  );
}
