"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isNavItemActive } from "@/components/layout/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The `lg`-and-up counterpart of the tab bar, driven by the same config.
 *
 * The previous header had no active state at all - nothing on screen said which
 * section you were in. Here the current section is a filled lavender pill, and
 * the primary action keeps the same emphasis it has in the tab bar.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        const Icon = item.icon;

        if (item.primary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(buttonVariants({ size: "sm" }), "ml-2")}
            >
              <Icon aria-hidden />
              {item.label}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-body-sm inline-flex h-10 items-center gap-2 rounded-lg px-3 font-medium transition-colors",
              active
                ? "bg-lavender text-primary-strong"
                : "text-muted-foreground hover:bg-lavender/60 hover:text-primary-strong",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
