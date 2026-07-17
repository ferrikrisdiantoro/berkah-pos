"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Kotak pencarian + filter untuk halaman daftar. Menulis ke URL (?q=&f=)
 * sehingga hasilnya di-filter di server.
 */
export function SearchFilter({
  placeholder = "Cari…",
  filters,
  filterLabel = "Semua",
}: {
  placeholder?: string;
  filters?: FilterOption[];
  filterLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const f = params.get("f") ?? "";

  // Cari otomatis setelah user berhenti mengetik (debounce).
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (q) sp.set("q", q);
      else sp.delete("q");
      const next = sp.toString();
      if (next !== params.toString()) router.replace(`${pathname}?${next}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setFilter(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("f", value);
    else sp.delete("f");
    router.replace(`${pathname}?${sp.toString()}`);
  }

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

      {filters && filters.length > 0 && (
        <select
          value={f}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">{filterLabel}</option>
          {filters.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
