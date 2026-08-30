"use client";

import type { HelpedValue } from "@/lib/migraines/catalog";
import { cn } from "@/lib/utils";

/**
 * Three-state "did it help?" control.
 *
 * "Unsure" is a real answer, distinct from leaving the question alone: pressing
 * the active choice again clears it back to not recorded, so the two never get
 * conflated in the data.
 */
export function HelpedToggle({
  value,
  onChange,
  options,
  labels,
}: {
  value: HelpedValue | null;
  onChange: (next: HelpedValue | null) => void;
  options: readonly HelpedValue[];
  labels: Record<HelpedValue, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(value === option ? null : option)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input hover:bg-muted",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
