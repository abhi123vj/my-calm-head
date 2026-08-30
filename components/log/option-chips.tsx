"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { type CatalogItem, isCustomValue, labelFor } from "@/lib/migraines/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

/**
 * Predefined options plus "Other".
 *
 * Selected values are plain strings, so a typed answer sits in the same array
 * as a catalogue id and needs no special handling anywhere downstream. Custom
 * entries are shown as removable chips after the predefined ones.
 *
 * The chip itself is the shared `Chip` control, so these answer sets, the
 * duration bands, the sleep-quality picker and the did-it-help toggles all look
 * and behave the same.
 */

type MultiProps = {
  options: readonly CatalogItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  otherLabel?: string;
  placeholder?: string;
};

export function OptionChips({
  options,
  selected,
  onChange,
  otherLabel = "Other",
  placeholder = "Type your own answer",
}: MultiProps) {
  const known = new Set(options.map((option) => option.id));
  const custom = selected.filter((value) => !known.has(value));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="space-y-4">
      <ChipGroup>
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={selected.includes(option.id)}
            onClick={() => toggle(option.id)}
          />
        ))}
        {custom.map((value) => (
          <Chip
            key={value}
            label={value}
            selected
            onClick={() => toggle(value)}
            removable
          />
        ))}
      </ChipGroup>

      <CustomEntry
        label={otherLabel}
        placeholder={placeholder}
        onAdd={(value) => {
          if (!selected.includes(value)) onChange([...selected, value]);
        }}
      />
    </div>
  );
}

type SingleProps = {
  options: readonly CatalogItem[];
  selected: string | null;
  onChange: (next: string | null) => void;
  otherLabel?: string;
  placeholder?: string;
};

export function SingleOptionChips({
  options,
  selected,
  onChange,
  otherLabel = "Other",
  placeholder = "Type your own answer",
}: SingleProps) {
  const known = new Set(options.map((option) => option.id));
  const customSelected = selected !== null && !known.has(selected);

  return (
    <div className="space-y-4">
      <ChipGroup>
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={selected === option.id}
            // Clicking the active choice clears it, so an answer given by
            // mistake can be taken back without a separate "none" option.
            onClick={() => onChange(selected === option.id ? null : option.id)}
          />
        ))}
        {customSelected ? (
          <Chip label={selected} selected onClick={() => onChange(null)} removable />
        ) : null}
      </ChipGroup>

      <CustomEntry
        label={otherLabel}
        placeholder={placeholder}
        onAdd={(value) => onChange(value)}
      />
    </div>
  );
}

/**
 * The "add your own" affordance, shared by both chip sets.
 *
 * On a phone the open state stacks the field above its buttons rather than
 * competing for one row, which is what previously pushed the Cancel button off
 * the edge at 320px.
 */
export function CustomEntry({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setValue("");
    setOpen(false);
  };

  const close = () => {
    setValue("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <div className="border-border bg-surface-sunken/60 space-y-2 rounded-lg border p-3 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // The chips live inside the wizard's form; Enter must add the answer
          // rather than submit the step.
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") close();
        }}
        className="sm:max-w-xs"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" className="flex-1 sm:flex-none" onClick={commit}>
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="flex-1 sm:flex-none"
          onClick={close}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Read-only chip list, for the review step and episode details. */
export function ValueChips({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-body-sm text-muted-foreground">Not recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant={isCustomValue(value) ? "custom" : "lavender"}>
          {labelFor(value)}
        </Badge>
      ))}
    </div>
  );
}
