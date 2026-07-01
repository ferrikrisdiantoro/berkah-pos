import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            BM
          </div>
          <h1 className="text-xl font-bold">Berkah POS</h1>
          <p className="text-sm text-muted-foreground">UD. Berkah Mina</p>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
