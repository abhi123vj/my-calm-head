import { AppHeader } from "@/components/layout/app-header";
import { requireSession } from "@/lib/auth/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The real authorization check. Proxy only does an optimistic redirect.
  const session = await requireSession();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader username={session.username} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
