import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { FlashToaster } from "@/components/flash-toaster";
import { SessionRefresher } from "@/components/session-refresher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts sudah menjaga, tapi periksa lagi demi keamanan.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <SessionRefresher />
      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email ?? "Pengguna"} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
