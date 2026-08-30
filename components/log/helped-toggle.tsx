"use client";

import type { HelpedValue } from "@/lib/migraines/catalog";
import { Chip, ChipGroup } from "@/components/ui/chip";

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
    <ChipGroup>
      {options.map((option) => (
        <Chip
          key={option}
          label={labels[option]}
          selected={value === option}
          onClick={() => onChange(value === option ? null : option)}
        />
      ))}
    </ChipGroup>
  );
}
