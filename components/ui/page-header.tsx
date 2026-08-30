import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The title block every screen opens with.
 *
 * On a phone the action drops below the title at full width instead of being
 * squeezed onto the same line - the previous `flex-wrap justify-between` left a
 * button stranded on its own row with the title's whitespace above it.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="text-title text-balance text-foreground">{title}</h1>
          {description ? (
            <p className="text-body-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** The small uppercase heading that opens a group of related content. */
export function SectionHeading({
  children,
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2 className={cn("eyebrow", className)} {...props}>
      {children}
    </h2>
  );
}
