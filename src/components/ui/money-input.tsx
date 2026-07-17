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
  const format = (n: number | undefined) =>
    n === undefined || n === null || Number.isNaN(n) || n === 0
      ? ""
      : new Intl.NumberFormat("id-ID").format(n);

  const [text, setText] = React.useState<string>(format(value ?? defaultValue));

  // Ikuti perubahan dari luar (mis. harga terisi otomatis saat pilih produk).
  React.useEffect(() => {
    if (value !== undefined) setText(format(value));
  }, [value]);

  const num = Number(text.replace(/\./g, "").replace(/[^\d]/g, "")) || 0;

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d]/g, "");
    const n = Number(digits) || 0;
    setText(digits ? new Intl.NumberFormat("id-ID").format(n) : "");
    onValueChange?.(n);
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
