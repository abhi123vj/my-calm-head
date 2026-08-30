"use client";

import { Pill, Plus, Trash2 } from "lucide-react";

import {
  COMMON_MEDICATIONS,
  HELPED_LABELS,
  HELPED_VALUES,
  type HelpedValue,
} from "@/lib/migraines/catalog";
import type { MedicationDraft } from "@/components/log/wizard-state";
import { HelpedToggle } from "@/components/log/helped-toggle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
        <EmptyState
          icon={Pill}
          title="No medication recorded"
          description="Add anything you took for this episode, including the time and whether it helped."
          action={
            <Button type="button" onClick={add}>
              <Plus aria-hidden />
              Add medication
            </Button>
          }
        />
      ) : null}

      {medications.map((medication, index) => (
        <div
          key={medication.key}
          className="border-border bg-card space-y-4 rounded-xl border p-4 shadow-card"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">Medication {index + 1}</span>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              htmlFor={`${medication.key}-name`}
              className="sm:col-span-2"
            >
              <Input
                id={`${medication.key}-name`}
                list={MEDICATION_LIST_ID}
                value={medication.name}
                placeholder="Start typing, or choose a common name"
                onChange={(event) =>
                  update(medication.key, { name: event.target.value })
                }
              />
            </Field>

            <Field
              label="Dosage"
              htmlFor={`${medication.key}-dosage`}
              className="sm:col-span-2"
            >
              <Input
                id={`${medication.key}-dosage`}
                value={medication.dosage}
                placeholder="As you took it, e.g. 1 tablet"
                onChange={(event) =>
                  update(medication.key, { dosage: event.target.value })
                }
              />
            </Field>

            <Field label="Date taken" htmlFor={`${medication.key}-date`}>
              <Input
                id={`${medication.key}-date`}
                type="date"
                value={medication.takenDate}
                onChange={(event) =>
                  update(medication.key, { takenDate: event.target.value })
                }
              />
            </Field>

            <Field label="Time taken" htmlFor={`${medication.key}-time`}>
              <Input
                id={`${medication.key}-time`}
                type="time"
                value={medication.takenTime}
                onChange={(event) =>
                  update(medication.key, { takenTime: event.target.value })
                }
              />
            </Field>
          </div>

          <FieldGroup label="Did it help?">
            <HelpedToggle
              value={medication.helped}
              onChange={(helped: HelpedValue | null) =>
                update(medication.key, { helped })
              }
              options={HELPED_VALUES}
              labels={HELPED_LABELS}
            />
          </FieldGroup>

          <Field label="Notes" htmlFor={`${medication.key}-notes`}>
            <Textarea
              id={`${medication.key}-notes`}
              rows={2}
              value={medication.notes}
              placeholder="Optional"
              onChange={(event) =>
                update(medication.key, { notes: event.target.value })
              }
            />
          </Field>
        </div>
      ))}

      {medications.length > 0 ? (
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={add}>
          <Plus aria-hidden />
          Add another medication
        </Button>
      ) : null}
    </div>
  );
}
