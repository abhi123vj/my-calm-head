import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The shared empty state.
 *
 * Every empty screen in the app was a dashed grey box, which reads as a broken
 * or unfinished layout rather than as a deliberate state. This one is a real
 * surface with a soft lavender medallion, a title, one line of explanation and
 * the action that resolves it - so an empty history looks like a place you have
 * not filled in yet, not an error.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-10 text-center shadow-card sm:py-12",
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className="mb-4 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-lavender to-lavender-strong text-primary-strong"
        >
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="text-subheading text-foreground">{title}</p>
      {description ? (
        <p className="text-body-sm text-muted-foreground mt-1.5 max-w-sm text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
