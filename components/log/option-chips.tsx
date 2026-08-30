"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { type CatalogItem, isCustomValue, labelFor } from "@/lib/migraines/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Predefined options plus "Other".
 *
 * Selected values are plain strings, so a typed answer sits in the same array
 * as a catalogue id and needs no special handling anywhere downstream. Custom
 * entries are shown as removable chips after the predefined ones.
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            active={selected.includes(option.id)}
            onClick={() => toggle(option.id)}
          />
        ))}
        {custom.map((value) => (
          <Chip
            key={value}
            label={value}
            active
            onClick={() => toggle(value)}
            removable
          />
        ))}
      </div>

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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            active={selected === option.id}
            // Clicking the active choice clears it, so an answer given by
            // mistake can be taken back without a separate "none" option.
            onClick={() => onChange(selected === option.id ? null : option.id)}
          />
        ))}
        {customSelected ? (
          <Chip
            label={selected}
            active
            onClick={() => onChange(null)}
            removable
          />
        ) : null}
      </div>

      <CustomEntry
        label={otherLabel}
        placeholder={placeholder}
        onAdd={(value) => onChange(value)}
      />
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  removable = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  removable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input hover:bg-muted",
      )}
    >
      {label}
      {removable ? <X className="size-3.5 opacity-70" aria-hidden /> : null}
    </button>
  );
}

function CustomEntry({
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

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + {label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // The chips live inside the wizard's form; Enter must add the answer
          // rather than submit the step.
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        className="max-w-xs"
      />
      <Button type="button" size="sm" onClick={commit}>
        Add
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setValue("");
          setOpen(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}

/** Read-only chip list, for the review step and episode details. */
export function ValueChips({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground text-sm">Not recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
            isCustomValue(value) ? "border-dashed" : "border-input",
          )}
        >
          {labelFor(value)}
        </span>
      ))}
    </div>
  );
}
