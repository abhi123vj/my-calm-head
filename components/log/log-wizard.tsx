"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Pencil } from "lucide-react";

import {
  DURATION_BANDS,
  HEADACHE_TYPES,
  MAX_SEVERITY,
  MIN_SEVERITY,
  PAIN_LOCATIONS,
  POSSIBLE_TRIGGERS,
  SEVERITY_ANCHOR_HIGH,
  SEVERITY_ANCHOR_LOW,
  SEVERITY_LABELS,
  SLEEP_QUALITY_LABELS,
  SLEEP_QUALITY_LEVELS,
  SYMPTOMS,
  TIME_PRECISIONS,
  TIME_PRECISION_LABELS,
  labelFor,
  type SleepQuality,
  type TimePrecision,
} from "@/lib/migraines/catalog";
import { formatDuration } from "@/lib/time";
import { severityBand } from "@/lib/migraines/severity-scale";
import { saveMigraine, saveMigraineEdit } from "@/lib/actions/migraines";
import {
  createInitialState,
  customToMinutes,
  isMidasDraftEmpty,
  parseSleepHours,
  toInput,
  toMidasAnswers,
  type WizardState,
} from "@/components/log/wizard-state";
import { OptionChips, SingleOptionChips, ValueChips } from "@/components/log/option-chips";
import { MedicationsEditor } from "@/components/log/medications-editor";
import { ReliefEditor } from "@/components/log/relief-editor";
import { MidasEditor, MidasScoreCard } from "@/components/log/midas-editor";
import { scoreMidas } from "@/lib/midas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StepId =
  | "timing"
  | "duration"
  | "severity"
  | "type"
  | "location"
  | "symptoms"
  | "triggers"
  | "sleep"
  | "medications"
  | "relief"
  | "midas"
  | "notes"
  | "review";

const STEPS: { id: StepId; title: string; question: string }[] = [
  { id: "timing", title: "Timing", question: "When did the episode start?" },
  { id: "duration", title: "Duration", question: "How long did the episode last?" },
  { id: "severity", title: "Pain", question: "How painful was the episode?" },
  { id: "type", title: "Headache type", question: "What type of headache was it?" },
  { id: "location", title: "Location", question: "Where did it hurt?" },
  { id: "symptoms", title: "Symptoms", question: "What symptoms did you experience?" },
  { id: "triggers", title: "Triggers", question: "What could have triggered the episode?" },
  { id: "sleep", title: "Sleep", question: "How did you sleep beforehand?" },
  { id: "medications", title: "Medication", question: "What medications did you take?" },
  { id: "relief", title: "Relief", question: "What relief methods did you try?" },
  { id: "midas", title: "Activity impact", question: "How did this episode affect your activities?" },
  { id: "notes", title: "Notes", question: "Do you have any additional notes?" },
  { id: "review", title: "Review", question: "Review and save" },
];

export function LogWizard({
  initialState,
  editingId = null,
}: {
  initialState?: WizardState;
  editingId?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(
    () => initialState ?? createInitialState(),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const patch = (changes: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...changes }));

  const save = (status: "draft" | "complete") => {
    setErrors([]);
    startTransition(async () => {
      const payload = toInput(state, status);
      const result = editingId
        ? await saveMigraineEdit(editingId, payload)
        : await saveMigraine(payload);

      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  };

  const goTo = (index: number) => {
    setStepIndex(index);
    // A step change replaces the whole view; without this a long step such as
    // MIDAS opens halfway down.
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <StepProgress stepIndex={stepIndex} onJump={goTo} />

      <div className="space-y-1.5">
        <h1 className="text-title text-balance">{step.question}</h1>
        {step.id !== "review" ? (
          <p className="text-body-sm text-muted-foreground">
            Every question except the start date is optional.
          </p>
        ) : null}
      </div>

      <StepBody step={step.id} state={state} patch={patch} onJump={goTo} />

      {errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save this episode</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <WizardActions
        isLastStep={isLastStep}
        isFirstStep={stepIndex === 0}
        pending={pending}
        editing={editingId !== null}
        onBack={() => goTo(Math.max(0, stepIndex - 1))}
        onNext={() => goTo(Math.min(STEPS.length - 1, stepIndex + 1))}
        onSave={save}
      />
    </div>
  );
}

/**
 * Back / Next / save.
 *
 * Sticky above the tab bar on a phone, so advancing thirteen steps never means
 * scrolling to the bottom of each one. On desktop it settles into a normal
 * card at the end of the step. The switch happens at `lg`, matching where the
 * tab bar itself disappears.
 */
function WizardActions({
  isFirstStep,
  isLastStep,
  pending,
  editing,
  onBack,
  onNext,
  onSave,
}: {
  isFirstStep: boolean;
  isLastStep: boolean;
  pending: boolean;
  editing: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: (status: "draft" | "complete") => void;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] z-30 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md",
        "sm:-mx-6 sm:px-6",
        "lg:static lg:mx-0 lg:flex lg:items-center lg:gap-3 lg:space-y-0 lg:rounded-xl lg:border lg:bg-card lg:p-4 lg:shadow-card",
      )}
    >
      <div className="flex gap-2 lg:contents">
        <Button
          type="button"
          variant="outline"
          disabled={isFirstStep || pending}
          onClick={onBack}
          className="lg:order-1"
        >
          <ArrowLeft aria-hidden />
          Back
        </Button>

        {isLastStep ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => onSave("complete")}
            className="flex-1 lg:order-3 lg:ml-auto lg:flex-none"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Save episode"}
            {pending ? null : <Check aria-hidden />}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={onNext}
            className="flex-1 lg:order-3 lg:ml-auto lg:flex-none"
          >
            Next
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full lg:order-2 lg:w-auto"
        disabled={pending}
        onClick={() => onSave("draft")}
      >
        Save and finish later
      </Button>
    </div>
  );
}

/**
 * Progress and step jumping.
 *
 * The previous control was thirteen 1.5px-tall bars, which on a phone were
 * roughly 22 x 6px each - visible, but not something a thumb can hit. The bar
 * here is a plain indicator, and jumping to a step happens in a disclosure of
 * full-width rows that are comfortably tappable and readable.
 */
function StepProgress({
  stepIndex,
  onJump,
}: {
  stepIndex: number;
  onJump: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const step = STEPS[stepIndex];
  const percent = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm min-w-0 truncate font-medium">{step.title}</p>
        <p className="text-caption text-muted-foreground shrink-0 tabular-nums">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label="Wizard progress"
        className="bg-lavender h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="border-border bg-card overflow-hidden rounded-lg border"
      >
        <summary className="text-body-sm text-muted-foreground hover:text-primary-strong flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 [&::-webkit-details-marker]:hidden">
          Jump to a step
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </summary>
        <ul className="border-border divide-border max-h-72 divide-y overflow-y-auto border-t">
          {STEPS.map((entry, index) => {
            const done = index < stepIndex;
            const current = index === stepIndex;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    setOpen(false);
                    onJump(index);
                  }}
                  className={cn(
                    "text-body-sm flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors",
                    current
                      ? "bg-lavender text-primary-strong font-semibold"
                      : "hover:bg-lavender/50",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "text-caption flex size-6 shrink-0 items-center justify-center rounded-full tabular-nums",
                      current
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-lavender-strong text-primary-strong"
                          : "bg-surface-sunken text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 truncate">{entry.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

function StepBody({
  step,
  state,
  patch,
  onJump,
}: {
  step: StepId;
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
  onJump: (index: number) => void;
}) {
  switch (step) {
    case "timing":
      return <TimingStep state={state} patch={patch} />;
    case "duration":
      return <DurationStep state={state} patch={patch} />;
    case "severity":
      return <SeverityStep state={state} patch={patch} />;
    case "type":
      return (
        <div className="space-y-3">
          <SingleOptionChips
            options={HEADACHE_TYPES}
            selected={state.headacheType}
            onChange={(headacheType) => patch({ headacheType })}
            placeholder="How would you describe it?"
          />
          <p className="text-caption text-muted-foreground">
            This records how you classify the episode for your own notes. It is
            not a diagnosis.
          </p>
        </div>
      );
    case "location":
      return (
        <OptionChips
          options={PAIN_LOCATIONS}
          selected={state.painLocations}
          onChange={(painLocations) => patch({ painLocations })}
          placeholder="Where else did it hurt?"
        />
      );
    case "symptoms":
      return (
        <OptionChips
          options={SYMPTOMS}
          selected={state.symptoms}
          onChange={(symptoms) => patch({ symptoms })}
          placeholder="Another symptom"
        />
      );
    case "triggers":
      return (
        <div className="space-y-3">
          <OptionChips
            options={POSSIBLE_TRIGGERS}
            selected={state.possibleTriggers}
            onChange={(possibleTriggers) => patch({ possibleTriggers })}
            placeholder="Something else you noticed"
          />
          <p className="text-caption text-muted-foreground">
            These are things you noticed around the episode. Recording one here
            does not mean it caused the migraine.
          </p>
        </div>
      );
    case "sleep":
      return <SleepStep state={state} patch={patch} />;
    case "medications":
      return (
        <MedicationsEditor
          medications={state.medications}
          onChange={(medications) => patch({ medications })}
        />
      );
    case "relief":
      return (
        <ReliefEditor
          reliefMethods={state.reliefMethods}
          onChange={(reliefMethods) => patch({ reliefMethods })}
        />
      );
    case "midas":
      return (
        <MidasEditor midas={state.midas} onChange={(midas) => patch({ midas })} />
      );
    case "notes":
      return (
        <Field
          label="Anything else worth remembering"
          htmlFor="notes"
          hint="Only you will read this."
        >
          <Textarea
            id="notes"
            rows={8}
            value={state.notes}
            aria-describedby="notes-hint"
            placeholder="What you were doing beforehand, how you felt, anything unusual…"
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
      );
    case "review":
      return <ReviewStep state={state} onJump={onJump} />;
  }
}

function TimingStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="start-date">
            <Input
              id="start-date"
              type="date"
              value={state.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
          </Field>
          <Field label="Time" htmlFor="start-time">
            <Input
              id="start-time"
              type="time"
              value={state.startTime}
              disabled={state.startPrecision === "unknown"}
              onChange={(event) => patch({ startTime: event.target.value })}
            />
          </Field>
        </div>

        <FieldGroup label="How sure are you of the time?">
          <PrecisionPicker
            value={state.startPrecision}
            onChange={(startPrecision) => patch({ startPrecision })}
          />
        </FieldGroup>
      </div>

      <div className="border-border space-y-4 border-t pt-5">
        <CheckboxField
          label="I know when it ended"
          className="-ml-2"
          checked={state.knowsEnd}
          onChange={(event) =>
            patch({
              knowsEnd: event.target.checked,
              // Recording an end means the duration is measurable; clearing it
              // must not leave a "calculated" duration with nothing to
              // calculate from.
              durationKind: event.target.checked
                ? "calculated"
                : state.durationKind === "calculated"
                  ? "unknown"
                  : state.durationKind,
            })
          }
        />

        {state.knowsEnd ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="End date" htmlFor="end-date">
                <Input
                  id="end-date"
                  type="date"
                  value={state.endDate}
                  onChange={(event) => patch({ endDate: event.target.value })}
                />
              </Field>
              <Field label="End time" htmlFor="end-time">
                <Input
                  id="end-time"
                  type="time"
                  value={state.endTime}
                  disabled={state.endPrecision === "unknown"}
                  onChange={(event) => patch({ endTime: event.target.value })}
                />
              </Field>
            </div>
            <FieldGroup label="How sure are you of the end time?">
              <PrecisionPicker
                value={state.endPrecision}
                onChange={(endPrecision) => patch({ endPrecision })}
              />
            </FieldGroup>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PrecisionPicker({
  value,
  onChange,
}: {
  value: TimePrecision;
  onChange: (next: TimePrecision) => void;
}) {
  return (
    <ChipGroup>
      {TIME_PRECISIONS.map((precision) => (
        <Chip
          key={precision}
          label={TIME_PRECISION_LABELS[precision]}
          selected={value === precision}
          onClick={() => onChange(precision)}
        />
      ))}
    </ChipGroup>
  );
}

function SleepStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-6">
      <Field
        label="Hours slept"
        htmlFor="sleep-hours"
        hint="The night before the episode. Half hours are fine."
      >
        <Input
          id="sleep-hours"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.5}
          value={state.sleepHours}
          placeholder="e.g. 6.5"
          aria-describedby="sleep-hours-hint"
          onChange={(event) => patch({ sleepHours: event.target.value })}
          className="w-32"
        />
      </Field>

      <FieldGroup label="Sleep quality">
        <ChipGroup>
          {SLEEP_QUALITY_LEVELS.map((quality) => (
            <Chip
              key={quality}
              label={SLEEP_QUALITY_LABELS[quality]}
              selected={state.sleepQuality === quality}
              // Pressing the active choice clears it, so a mis-tap can be taken
              // back without needing a separate "not recorded" option.
              onClick={() =>
                patch({
                  sleepQuality:
                    state.sleepQuality === quality ? null : (quality as SleepQuality),
                })
              }
            />
          ))}
        </ChipGroup>
      </FieldGroup>
    </div>
  );
}

function DurationStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
}) {
  // When both ends are known the duration is arithmetic, not a question.
  const calculated = useMemo(() => {
    if (!state.knowsEnd || !state.startDate || !state.endDate) return null;
    const start = new Date(`${state.startDate}T${state.startTime || "12:00"}`);
    const end = new Date(`${state.endDate}T${state.endTime || "12:00"}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
    return minutes >= 0 ? minutes : null;
  }, [state.knowsEnd, state.startDate, state.startTime, state.endDate, state.endTime]);

  return (
    <div className="space-y-5">
      {calculated !== null ? (
        <div className="border-lavender-deep/50 from-lavender/70 to-card rounded-xl border bg-gradient-to-br p-4">
          <p className="eyebrow">Calculated from the times you entered</p>
          <p className="text-title text-primary-strong mt-1">
            {formatDuration(calculated) ?? "Unknown"}
          </p>
          {state.durationKind !== "calculated" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => patch({ durationKind: "calculated" })}
            >
              Use this duration
            </Button>
          ) : (
            <p className="text-caption text-muted-foreground mt-2 flex items-center gap-1.5">
              <Check className="size-3.5" aria-hidden />
              Using this. Pick an option below to override it.
            </p>
          )}
        </div>
      ) : null}

      <ChipGroup>
        {DURATION_BANDS.map((band) => (
          <Chip
            key={band.id}
            label={band.label}
            selected={state.durationKind === "band" && state.durationBand === band.id}
            onClick={() => patch({ durationKind: "band", durationBand: band.id })}
          />
        ))}
        <Chip
          label="Still ongoing"
          selected={state.durationKind === "ongoing"}
          onClick={() =>
            patch({
              durationKind: "ongoing",
              // An ongoing episode cannot also have an end time.
              knowsEnd: false,
              endDate: "",
              endTime: "",
            })
          }
        />
        <Chip
          label="Custom duration"
          selected={state.durationKind === "custom"}
          onClick={() => patch({ durationKind: "custom" })}
        />
        <Chip
          label="Unknown"
          selected={state.durationKind === "unknown"}
          onClick={() => patch({ durationKind: "unknown" })}
        />
      </ChipGroup>

      {state.durationKind === "custom" ? (
        <div className="border-border bg-card space-y-3 rounded-xl border p-4 shadow-card">
          <div className="flex items-end gap-3">
            <Field label="Hours" htmlFor="custom-hours" className="flex-1">
              <Input
                id="custom-hours"
                type="number"
                inputMode="numeric"
                min={0}
                value={state.customHours}
                onChange={(event) => patch({ customHours: event.target.value })}
              />
            </Field>
            <Field label="Minutes" htmlFor="custom-minutes" className="flex-1">
              <Input
                id="custom-minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={state.customMinutes}
                onChange={(event) => patch({ customMinutes: event.target.value })}
              />
            </Field>
          </div>
          <p className="text-body-sm text-muted-foreground">
            {formatDuration(customToMinutes(state)) ?? "Enter a duration"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const SEVERITY_VALUES = Array.from(
  { length: MAX_SEVERITY - MIN_SEVERITY + 1 },
  (_, index) => MIN_SEVERITY + index,
);

/**
 * Severity 1-10.
 *
 * A ten-value discrete choice, so it is ten buttons rather than a range slider:
 * a slider on a phone means dragging a 20px thumb to hit one of ten positions,
 * and it exposes nothing useful to a screen reader beyond the number. Each cell
 * carries its band colour when chosen, matching the calendar, and the number is
 * always printed so the colour is never the only encoding.
 */
function SeverityStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
}) {
  const band = severityBand(state.severity);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="text-title flex size-16 shrink-0 items-center justify-center rounded-2xl tabular-nums transition-colors"
          style={{ backgroundColor: band.background, color: band.foreground }}
        >
          {state.severity ?? "—"}
        </span>
        <div className="min-w-0">
          <p className="text-subheading">
            {state.severity === null
              ? "Not recorded"
              : SEVERITY_LABELS[state.severity]}
          </p>
          {state.severity !== null ? (
            <p className="text-body-sm text-muted-foreground">
              {state.severity} of {MAX_SEVERITY}
            </p>
          ) : null}
        </div>
      </div>

      <FieldGroup label="Pick a level">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {SEVERITY_VALUES.map((value) => {
            const selected = state.severity === value;
            const valueBand = severityBand(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                aria-label={`Severity ${value} of ${MAX_SEVERITY}, ${SEVERITY_LABELS[value]}`}
                // Tapping the chosen level again clears it, matching every other
                // single-choice control in the wizard.
                onClick={() => patch({ severity: selected ? null : value })}
                className={cn(
                  "text-subheading flex h-12 items-center justify-center rounded-lg border tabular-nums transition-all active:translate-y-px",
                  selected
                    ? "border-primary-strong shadow-raised"
                    : "border-border bg-card hover:border-lavender-deep hover:bg-lavender/50",
                )}
                style={
                  selected
                    ? {
                        backgroundColor: valueBand.background,
                        color: valueBand.foreground,
                      }
                    : undefined
                }
              >
                {value}
              </button>
            );
          })}
        </div>
        <div className="text-caption text-muted-foreground flex justify-between">
          <span>
            {MIN_SEVERITY} · {SEVERITY_ANCHOR_LOW}
          </span>
          <span>
            {MAX_SEVERITY} · {SEVERITY_ANCHOR_HIGH}
          </span>
        </div>
      </FieldGroup>

      {state.severity !== null ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => patch({ severity: null })}
        >
          Clear severity
        </Button>
      ) : null}
    </div>
  );
}

function ReviewStep({
  state,
  onJump,
}: {
  state: WizardState;
  onJump: (index: number) => void;
}) {
  const midasResult = isMidasDraftEmpty(state.midas)
    ? null
    : scoreMidas(toMidasAnswers(state.midas));

  const rows: { step: StepId; label: string; value: React.ReactNode }[] = [
    { step: "timing", label: "Started", value: describeStart(state) },
    { step: "duration", label: "Duration", value: describeDuration(state) },
    {
      step: "severity",
      label: "Severity",
      value:
        state.severity === null
          ? "Not recorded"
          : `${state.severity} / 10 · ${SEVERITY_LABELS[state.severity]}`,
    },
    {
      step: "type",
      label: "Headache type",
      value: state.headacheType ? labelFor(state.headacheType) : "Not recorded",
    },
    {
      step: "location",
      label: "Pain locations",
      value: <ValueChips values={state.painLocations} />,
    },
    { step: "symptoms", label: "Symptoms", value: <ValueChips values={state.symptoms} /> },
    {
      step: "triggers",
      label: "Possible triggers",
      value: <ValueChips values={state.possibleTriggers} />,
    },
    { step: "sleep", label: "Sleep", value: describeSleep(state) },
    { step: "medications", label: "Medication", value: describeMedications(state) },
    { step: "relief", label: "Relief methods", value: describeRelief(state) },
    {
      step: "notes",
      label: "Notes",
      value: state.notes.trim().length > 0 ? state.notes : "Not recorded",
    },
  ];

  return (
    <div className="space-y-4">
      <dl className="border-border bg-card divide-border divide-y rounded-xl border shadow-card">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 p-4 sm:grid sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1 sm:contents">
              <dt className="eyebrow sm:text-body-sm sm:text-muted-foreground sm:normal-case sm:tracking-normal">
                {row.label}
              </dt>
              <dd className="text-body-sm min-w-0 break-words whitespace-pre-wrap">
                {row.value}
              </dd>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${row.label.toLowerCase()}`}
              className="-mt-1 shrink-0 sm:mt-0"
              onClick={() => onJump(STEPS.findIndex((step) => step.id === row.step))}
            >
              <Pencil aria-hidden />
            </Button>
          </div>
        ))}
      </dl>

      {midasResult ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Activity impact</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onJump(STEPS.findIndex((step) => step.id === "midas"))}
            >
              <Pencil aria-hidden />
              Edit
            </Button>
          </div>
          <MidasScoreCard result={midasResult} />
        </div>
      ) : null}
    </div>
  );
}

function describeStart(state: WizardState): string {
  if (!state.startDate) return "Not recorded";
  if (state.startPrecision === "unknown") {
    return `${state.startDate} · time not known`;
  }
  const suffix = state.startPrecision === "approximate" ? " (approximate)" : "";
  return `${state.startDate} at ${state.startTime || "—"}${suffix}`;
}

function describeDuration(state: WizardState): string {
  switch (state.durationKind) {
    case "calculated": {
      if (!state.endDate) return "Not recorded";
      const start = new Date(`${state.startDate}T${state.startTime || "12:00"}`);
      const end = new Date(`${state.endDate}T${state.endTime || "12:00"}`);
      const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
      return formatDuration(minutes) ?? "Not recorded";
    }
    case "band":
      return DURATION_BANDS.find((band) => band.id === state.durationBand)?.label ??
        "Not recorded";
    case "custom":
      return formatDuration(customToMinutes(state)) ?? "Not recorded";
    case "ongoing":
      return "Still ongoing";
    case "unknown":
    default:
      return "Unknown";
  }
}

function describeSleep(state: WizardState): string {
  const hours = parseSleepHours(state.sleepHours);
  const parts: string[] = [];
  if (hours !== null) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (state.sleepQuality) parts.push(SLEEP_QUALITY_LABELS[state.sleepQuality].toLowerCase());
  return parts.length > 0 ? parts.join(" · ") : "Not recorded";
}

function describeMedications(state: WizardState): React.ReactNode {
  const filled = state.medications.filter(
    (medication) => medication.name.trim().length > 0,
  );
  if (filled.length === 0) return "Not recorded";

  return (
    <ul className="space-y-1">
      {filled.map((medication) => (
        <li key={medication.key}>
          {medication.name}
          {medication.dosage ? ` · ${medication.dosage}` : ""}
          {medication.takenTime ? ` · ${medication.takenTime}` : ""}
          {medication.helped ? ` · ${helpedText(medication.helped)}` : ""}
        </li>
      ))}
    </ul>
  );
}

function describeRelief(state: WizardState): React.ReactNode {
  if (state.reliefMethods.length === 0) return "Not recorded";

  return (
    <ul className="space-y-1">
      {state.reliefMethods.map((relief) => (
        <li key={relief.method}>
          {labelFor(relief.method)}
          {relief.helped ? ` · ${helpedText(relief.helped)}` : ""}
        </li>
      ))}
    </ul>
  );
}

function helpedText(helped: "yes" | "no" | "unsure"): string {
  return helped === "yes" ? "Helped" : helped === "no" ? "Did not help" : "Unsure";
}
