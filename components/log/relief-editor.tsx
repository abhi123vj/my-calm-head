"use client";

import {
  HELPED_LABELS,
  HELPED_VALUES,
  RELIEF_METHODS,
  labelFor,
  type HelpedValue,
} from "@/lib/migraines/catalog";
import type { ReliefDraft } from "@/components/log/wizard-state";
import { HelpedToggle } from "@/components/log/helped-toggle";
import { CustomEntry } from "@/components/log/option-chips";
import { Chip, ChipGroup } from "@/components/ui/chip";

/**
 * Relief methods, each with its own optional "did it help?".
 *
 * Selecting a method and rating it are separate steps: a method can be recorded
 * as tried without committing to whether it worked. The rating list only
 * appears once something is selected, so the step opens as a single question.
 */
export function ReliefEditor({
  reliefMethods,
  onChange,
}: {
  reliefMethods: ReliefDraft[];
  onChange: (next: ReliefDraft[]) => void;
}) {
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

  const customMethods = reliefMethods
    .map((relief) => relief.method)
    .filter((method) => !RELIEF_METHODS.some((item) => item.id === method));

  return (
    <div className="space-y-5">
      <ChipGroup>
        {RELIEF_METHODS.map((method) => (
          <Chip
            key={method.id}
            label={method.label}
            selected={selected.has(method.id)}
            onClick={() => toggle(method.id)}
          />
        ))}
        {customMethods.map((method) => (
          <Chip
            key={method}
            label={method}
            selected
            removable
            onClick={() => toggle(method)}
          />
        ))}
      </ChipGroup>

      <CustomEntry
        label="Other"
        placeholder="Type your own method"
        onAdd={(method) => {
          if (!selected.has(method)) {
            onChange([...reliefMethods, { method, helped: null }]);
          }
        }}
      />

      {reliefMethods.length > 0 ? (
        <div className="border-border bg-card divide-border divide-y rounded-xl border shadow-card">
          <p className="eyebrow px-4 pt-4 pb-3">Did they help? (optional)</p>
          {reliefMethods.map((relief) => (
            <div key={relief.method} className="space-y-2.5 px-4 py-3.5">
              <p className="text-body-sm font-medium">{labelFor(relief.method)}</p>
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
