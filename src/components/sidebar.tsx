"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";
import type { Role } from "@/lib/auth";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.master || role === "owner");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-contain" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Berkah POS</div>
          <div className="text-xs text-sidebar-foreground/70">UD. Berkah Mina</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sky-400" />
              )}
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-sky-400" : "")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-center text-[11px] text-sidebar-foreground/40">
        Berkah POS v1.0
      </div>
    </aside>
  );
}
