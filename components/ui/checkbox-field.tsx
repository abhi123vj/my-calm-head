import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A native checkbox with its label as one tappable row.
 *
 * The whole row is the target rather than the 16px box alone, which is what
 * made the filter groups awkward to use on a phone. Kept as a real
 * `input[type=checkbox]` so it still submits inside the plain GET filter form
 * with no client JavaScript.
 */
export function CheckboxField({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-body-sm transition-colors hover:bg-lavender/50 has-checked:bg-lavender/60 has-checked:font-medium has-checked:text-primary-strong",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-[18px] shrink-0 cursor-pointer rounded-sm"
        {...props}
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}
