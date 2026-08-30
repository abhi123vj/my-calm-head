"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isNavItemActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * The mobile tab bar.
 *
 * The header nav this replaces was a row of five text links that wrapped onto
 * three lines below 400px. Here every destination is a full-height cell, so the
 * tap target is the whole 64px column rather than the icon, and the app's main
 * action sits in the middle of the bar where a thumb reaches without stretching.
 *
 * Hidden from `lg` up, where the header nav takes over. A tablet keeps the
 * tab bar: it is a touch device, and the header nav does not fit beside the
 * brand and account controls until about 940px anyway.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-card/95 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex h-(--bottom-nav-height) max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item.href, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors",
                  active ? "text-primary-strong" : "text-muted-foreground",
                )}
              >
                {item.primary ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary-strong text-primary-foreground"
                        : "bg-primary text-primary-foreground group-hover:bg-primary-strong",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      active ? "bg-lavender" : "group-hover:bg-lavender/60",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                  </span>
                )}
                <span
                  className={cn(
                    "text-[0.6875rem] leading-none",
                    active && "font-semibold",
                  )}
                >
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
