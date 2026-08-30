"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The selectable pill used for every "pick one or more" answer in the app.
 *
 * Six near-identical copies of this markup existed across the wizard (options,
 * durations, time precision, sleep quality, relief methods, did-it-help), each
 * drifting slightly in padding and colour. They are all this component now, so
 * a change to the selected state happens once.
 *
 * Selection is signalled by a tick as well as by the lavender fill, so it does
 * not depend on seeing colour, and the control is 44px tall - these are the
 * primary input on a phone, not decoration.
 */
export function Chip({
  label,
  selected,
  onClick,
  removable = false,
  className,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Shows a cross instead of a tick, for a custom answer that can be taken back. */
  removable?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // `max-w-full` matters because a chip can hold an answer the user typed:
        // without it a long one grows past the flex container and off the screen.
        "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-4 py-2 text-left text-body-sm [overflow-wrap:anywhere] transition-colors duration-150 active:translate-y-px",
        selected
          ? "border-primary bg-lavender-strong font-medium text-primary-strong"
          : "border-border bg-card text-foreground hover:border-lavender-deep hover:bg-lavender/50",
        className,
      )}
    >
      {selected ? (
        removable ? (
          <X className="size-3.5 shrink-0 opacity-80" aria-hidden />
        ) : (
          <Check className="size-3.5 shrink-0" aria-hidden />
        )
      ) : null}
      <span className="min-w-0">{label}</span>
    </button>
  );
}

/** Consistent wrapping and spacing wherever chips appear as a set. */
export function ChipGroup({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {children}
    </div>
  );
}
