"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SelectFilter {
  param: string; // nama parameter URL, mis. "f" atau "owner"
  allLabel: string; // teks opsi "semua", mis. "Semua status"
  options: FilterOption[];
}

/**
 * Bar pencarian + filter untuk halaman daftar. Semua ditulis ke URL sehingga
 * hasilnya di-filter di server. Mendukung: kata kunci (debounce), rentang
 * tanggal, dan beberapa dropdown sekaligus.
 */
export function SearchFilter({
  placeholder = "Cari…",
  dateRange = false,
  selects = [],
  // Kompatibilitas lama (satu filter):
  filters,
  filterLabel = "Semua",
}: {
  placeholder?: string;
  dateRange?: boolean;
  selects?: SelectFilter[];
  filters?: FilterOption[];
  filterLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const allSelects: SelectFilter[] = filters
    ? [{ param: "f", allLabel: filterLabel, options: filters }, ...selects]
    : selects;

  const [q, setQ] = useState(params.get("q") ?? "");

  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Cari otomatis setelah berhenti mengetik (pakai params terbaru via ref).
  useEffect(() => {
    const t = setTimeout(() => {
      const current = paramsRef.current;
      const sp = new URLSearchParams(current.toString());
      if (q) sp.set("q", q);
      else sp.delete("q");
      const next = sp.toString();
      if (next !== current.toString()) router.replace(`${pathname}?${next}`);
    }, 350);
    return () => clearTimeout(t);
  }, [q, router, pathname]);

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  const hasActive =
    q ||
    (dateRange && (params.get("from") || params.get("to"))) ||
    allSelects.some((s) => params.get(s.param));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {dateRange && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={params.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value)}
            aria-label="Dari tanggal"
            className="h-10 rounded-md border border-border bg-background px-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">s/d</span>
          <input
            type="date"
            value={params.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value)}
            aria-label="Sampai tanggal"
            className="h-10 rounded-md border border-border bg-background px-2 text-sm"
          />
        </div>
      )}

      {allSelects.map((s) => (
        <select
          key={s.param}
          value={params.get(s.param) ?? ""}
          onChange={(e) => setParam(s.param, e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">{s.allLabel}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {hasActive && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="h-10 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          Reset
        </button>
      )}
    </div>
  );
}
