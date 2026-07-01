import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="text-sm text-muted-foreground md:hidden">Berkah POS</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium">{email}</div>
          <div className="text-xs text-muted-foreground">Staff</div>
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
