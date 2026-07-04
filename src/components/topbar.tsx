import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type Role } from "@/lib/auth";

export function Topbar({ email, role }: { email: string; role: Role }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="text-sm text-muted-foreground md:hidden">Berkah POS</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{email}</div>
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
