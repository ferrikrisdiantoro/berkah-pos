import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { FlashToaster } from "@/components/flash-toaster";
import { SessionRefresher } from "@/components/session-refresher";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // proxy.ts sudah menjaga, tapi periksa lagi demi keamanan.
  if (!user) redirect("/login");

  // Akun dinonaktifkan Master: tolak akses. Tidak redirect ke /login supaya
  // tidak berputar-putar (proxy akan melempar balik user yg masih punya sesi).
  if (!user.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-bold">Akun Dinonaktifkan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Akun ini sudah dinonaktifkan. Hubungi pemilik/Master untuk mengaktifkan kembali.
          </p>
          <form action={signOutAction} className="mt-4">
            <Button type="submit" className="w-full">
              Keluar
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SessionRefresher />
      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} role={user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
