import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/history", label: "History" },
  { href: "/insights", label: "Insights" },
  { href: "/log", label: "Log episode" },
] as const;

export function AppHeader({ username }: { username: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-6 py-3">
        <Link href="/" className="font-semibold">
          My Calm Head
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{username}</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
