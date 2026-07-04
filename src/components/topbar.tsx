import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { ROLE_LABEL, type Role } from "@/lib/auth";

export function Topbar({ email, role }: { email: string; role: Role }) {
  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav role={role} />
        <span className="text-sm font-semibold md:hidden">Berkah POS</span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 text-right leading-tight">
          <div className="truncate text-sm font-medium">{email}</div>
          <div className="text-xs">
            <span
              className={
                role === "owner"
                  ? "font-medium text-primary"
                  : "text-muted-foreground"
              }
            >
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <form action={signOutAction}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </form>
      </div>
    </header>
  );
}
