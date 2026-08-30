import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireSession } from "@/lib/auth/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The real authorization check. Proxy only does an optimistic redirect.
  const session = await requireSession();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader username={session.username} />

      {/* 16px gutters on a phone rather than 24px: at 320px that is 8% of the
          width handed back to the content. `pb-safe-nav` reserves room for the
          tab bar and the home indicator; from `md` the bar is gone and normal
          padding applies. */}
      <main className="pb-safe-nav mx-auto w-full max-w-6xl flex-1 px-4 pt-5 sm:px-6 sm:pt-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
