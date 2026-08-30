"use client";

import { useState } from "react";
import {
  HELPED_LABELS,
  HELPED_VALUES,
  RELIEF_METHODS,
  labelFor,
  type HelpedValue,
} from "@/lib/migraines/catalog";
import type { ReliefDraft } from "@/components/log/wizard-state";
import { HelpedToggle } from "@/components/log/helped-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Relief methods, each with its own optional "did it help?".
 *
 * Selecting a method and rating it are separate steps: a method can be recorded
 * as tried without committing to whether it worked.
 */
export function ReliefEditor({
  reliefMethods,
  onChange,
}: {
  reliefMethods: ReliefDraft[];
  onChange: (next: ReliefDraft[]) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const selected = new Set(reliefMethods.map((relief) => relief.method));

  const toggle = (method: string) => {
    onChange(
      selected.has(method)
        ? reliefMethods.filter((relief) => relief.method !== method)
        : [...reliefMethods, { method, helped: null }],
    );
  };

  const setHelped = (method: string, helped: HelpedValue | null) => {
    onChange(
      reliefMethods.map((relief) =>
        relief.method === method ? { ...relief, helped } : relief,
      ),
    );
  };

  const addCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed.length === 0 || selected.has(trimmed)) {
      setCustomValue("");
      setCustomOpen(false);
      return;
    }
    onChange([...reliefMethods, { method: trimmed, helped: null }]);
    setCustomValue("");
    setCustomOpen(false);
  };

  const customMethods = reliefMethods
    .map((relief) => relief.method)
    .filter((method) => !RELIEF_METHODS.some((item) => item.id === method));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {RELIEF_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            aria-pressed={selected.has(method.id)}
            onClick={() => toggle(method.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              selected.has(method.id)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-muted",
            )}
          >
            {method.label}
          </button>
        ))}
        {customMethods.map((method) => (
          <button
            key={method}
            type="button"
            aria-pressed
            onClick={() => toggle(method)}
            className="rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            {method}
          </button>
        ))}
      </div>

      {customOpen ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={customValue}
            placeholder="Type your own method"
            onChange={(event) => setCustomValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
              if (event.key === "Escape") {
                setCustomValue("");
                setCustomOpen(false);
              }
            }}
            className="max-w-xs"
          />
          <Button type="button" size="sm" onClick={addCustom}>
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setCustomValue("");
              setCustomOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCustomOpen(true)}
        >
          + Other
        </Button>
      )}

      {reliefMethods.length > 0 ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Did they help? (optional)
          </p>
          {reliefMethods.map((relief) => (
            <div
              key={relief.method}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <span className="text-sm">{labelFor(relief.method)}</span>
              <HelpedToggle
                value={relief.helped}
                onChange={(helped) => setHelped(relief.method, helped)}
                options={HELPED_VALUES}
                labels={HELPED_LABELS}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
