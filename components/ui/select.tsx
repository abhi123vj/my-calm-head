import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A styled native `<select>`.
 *
 * Deliberately native rather than a custom listbox: the filter panel is a plain
 * GET form that works without client JavaScript, and on a phone the platform
 * picker is both more usable and more accessible than anything rebuilt in
 * divs. Only the closed-state chrome is themed.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-11 w-full appearance-none rounded-lg border border-input bg-card py-1 pr-10 pl-3 text-base text-foreground transition-colors outline-none",
          "hover:border-border-strong focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted",
          "md:text-body",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  );
}
