"use client";

import { Trash2 } from "lucide-react";
import {
  COMMON_MEDICATIONS,
  HELPED_LABELS,
  HELPED_VALUES,
  type HelpedValue,
} from "@/lib/migraines/catalog";
import type { MedicationDraft } from "@/components/log/wizard-state";
import { HelpedToggle } from "@/components/log/helped-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MEDICATION_LIST_ID = "common-medications";

/**
 * Repeatable medication rows.
 *
 * The name field is a free-text input backed by a `<datalist>`: common names
 * are one keystroke away, and anything else can simply be typed. The app only
 * records what the user reports taking - it never suggests a medication and
 * says nothing about dosage.
 */
export function MedicationsEditor({
  medications,
  onChange,
}: {
  medications: MedicationDraft[];
  onChange: (next: MedicationDraft[]) => void;
}) {
  const update = (key: string, patch: Partial<MedicationDraft>) => {
    onChange(
      medications.map((medication) =>
        medication.key === key ? { ...medication, ...patch } : medication,
      ),
    );
  };

  const add = () => {
    onChange([
      ...medications,
      {
        key: `med-${Date.now()}-${medications.length}`,
        name: "",
        dosage: "",
        takenDate: "",
        takenTime: "",
        helped: null,
        notes: "",
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <datalist id={MEDICATION_LIST_ID}>
        {COMMON_MEDICATIONS.map((medication) => (
          <option key={medication.id} value={medication.label} />
        ))}
      </datalist>

      {medications.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No medication recorded for this episode.
        </p>
      ) : null}

      {medications.map((medication, index) => (
        <div key={medication.key} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              Medication {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange(medications.filter((item) => item.key !== medication.key))
              }
            >
              <Trash2 aria-hidden />
              Remove
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${medication.key}-name`}>Name</Label>
              <Input
                id={`${medication.key}-name`}
                list={MEDICATION_LIST_ID}
                value={medication.name}
                placeholder="Start typing, or choose a common name"
                onChange={(event) =>
                  update(medication.key, { name: event.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${medication.key}-dosage`}>Dosage</Label>
              <Input
                id={`${medication.key}-dosage`}
                value={medication.dosage}
                placeholder="As you took it, e.g. 1 tablet"
                onChange={(event) =>
                  update(medication.key, { dosage: event.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${medication.key}-date`}>Date taken</Label>
              <Input
                id={`${medication.key}-date`}
                type="date"
                value={medication.takenDate}
                onChange={(event) =>
                  update(medication.key, { takenDate: event.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${medication.key}-time`}>Time taken</Label>
              <Input
                id={`${medication.key}-time`}
                type="time"
                value={medication.takenTime}
                onChange={(event) =>
                  update(medication.key, { takenTime: event.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Did it help?</Label>
            <HelpedToggle
              value={medication.helped}
              onChange={(helped: HelpedValue | null) =>
                update(medication.key, { helped })
              }
              options={HELPED_VALUES}
              labels={HELPED_LABELS}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${medication.key}-notes`}>Notes</Label>
            <Textarea
              id={`${medication.key}-notes`}
              rows={2}
              value={medication.notes}
              placeholder="Optional"
              onChange={(event) =>
                update(medication.key, { notes: event.target.value })
              }
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add}>
        + Add medication
      </Button>
    </div>
  );
}
