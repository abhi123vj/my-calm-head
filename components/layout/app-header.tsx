import Link from "next/link";
import { LogOut } from "lucide-react";

import { CalmMark } from "@/components/layout/calm-mark";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * The top bar.
 *
 * On a phone and a tablet it carries identity and the account action only -
 * the sections themselves live in the bottom tab bar, within thumb reach. From
 * `lg` up the
 * navigation moves in here and the bar becomes the single place to orient
 * yourself.
 *
 * It is sticky rather than static so the way out of a long history or a long
 * wizard is always one tap away.
 */
export function AppHeader({ username }: { username: string }) {
  return (
    <header className="border-border bg-card/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-16">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 shrink-0 items-center gap-2.5 rounded-lg"
        >
          <span
            aria-hidden
            className="from-lavender-strong to-lavender-deep text-primary-strong flex size-9 shrink-0 items-center justify-center rounded-[0.7rem] bg-gradient-to-br"
          >
            <CalmMark />
          </span>
          <span className="text-subheading text-foreground truncate">
            My Calm Head
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 lg:gap-4">
          <DesktopNav />

          <div className="border-border flex items-center gap-2 lg:border-l lg:pl-4">
            <span className="text-body-sm text-muted-foreground hidden max-w-32 truncate sm:inline">
              {username}
            </span>
            <form action={logout}>
              {/* Icon-only on a phone, where the label would crowd the bar; the
                  accessible name is carried by the icon button either way. */}
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="lg:hidden"
              >
                <LogOut aria-hidden />
              </Button>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex"
              >
                <LogOut aria-hidden />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}

