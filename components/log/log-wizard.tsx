"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DURATION_BANDS,
  HEADACHE_TYPES,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="space-y-6">
      <StepProgress
        stepIndex={stepIndex}
        onJump={setStepIndex}
        title={step.title}
      />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{step.question}</h1>
        {step.id !== "review" ? (
          <p className="text-muted-foreground text-sm">
            Every question except the start date is optional.
          </p>
        ) : null}
      </div>

      <div className="min-h-64">
        <StepBody
          step={step.id}
          state={state}
          patch={patch}
          onJump={setStepIndex}
        />
      </div>

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

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={stepIndex === 0 || pending}
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
        >
          Back
        </Button>

        {isLastStep ? (
          <Button type="button" disabled={pending} onClick={() => save("complete")}>
            {pending ? "Saving…" : editingId ? "Save changes" : "Save episode"}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))
            }
          >
            Next
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          disabled={pending}
          onClick={() => save("draft")}
        >
          Save and finish later
        </Button>
      </div>
    </div>
  );
}

function StepProgress({
  stepIndex,
  onJump,
  title,
}: {
  stepIndex: number;
  onJump: (index: number) => void;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </span>
      </div>
      {/* Each segment is clickable so any answered step can be revisited
          directly, not only by stepping back one at a time. */}
      <div className="flex gap-1">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            title={step.title}
            aria-label={`Go to ${step.title}`}
            aria-current={index === stepIndex ? "step" : undefined}
            onClick={() => onJump(index)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= stepIndex ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
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
          <p className="text-muted-foreground text-xs">
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
          <p className="text-muted-foreground text-xs">
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
        <div className="space-y-2">
          <Label htmlFor="notes">Anything else worth remembering</Label>
          <Textarea
            id="notes"
            rows={8}
            value={state.notes}
            placeholder="What you were doing beforehand, how you felt, anything unusual…"
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </div>
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
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="start-date">Date</Label>
            <Input
              id="start-date"
              type="date"
              value={state.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start-time">Time</Label>
            <Input
              id="start-time"
              type="time"
              value={state.startTime}
              disabled={state.startPrecision === "unknown"}
              onChange={(event) => patch({ startTime: event.target.value })}
            />
          </div>
        </div>

        <PrecisionPicker
          value={state.startPrecision}
          onChange={(startPrecision) => patch({ startPrecision })}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={state.knowsEnd}
            onChange={(event) =>
              patch({
                knowsEnd: event.target.checked,
                // Recording an end means the duration is measurable; clearing
                // it must not leave a "calculated" duration with nothing to
                // calculate from.
                durationKind: event.target.checked
                  ? "calculated"
                  : state.durationKind === "calculated"
                    ? "unknown"
                    : state.durationKind,
              })
            }
          />
          I know when it ended
        </label>

        {state.knowsEnd ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={state.endDate}
                  onChange={(event) => patch({ endDate: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-time">End time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={state.endTime}
                  disabled={state.endPrecision === "unknown"}
                  onChange={(event) => patch({ endTime: event.target.value })}
                />
              </div>
            </div>
            <PrecisionPicker
              value={state.endPrecision}
              onChange={(endPrecision) => patch({ endPrecision })}
            />
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
    <div className="flex flex-wrap gap-2">
      {TIME_PRECISIONS.map((precision) => (
        <button
          key={precision}
          type="button"
          aria-pressed={value === precision}
          onClick={() => onChange(precision)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            value === precision
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input hover:bg-muted",
          )}
        >
          {TIME_PRECISION_LABELS[precision]}
        </button>
      ))}
    </div>
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
      <div className="space-y-1.5">
        <Label htmlFor="sleep-hours">Hours slept</Label>
        <Input
          id="sleep-hours"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.5}
          value={state.sleepHours}
          placeholder="e.g. 6.5"
          onChange={(event) => patch({ sleepHours: event.target.value })}
          className="w-32"
        />
        <p className="text-muted-foreground text-xs">
          The night before the episode. Half hours are fine.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Sleep quality</Label>
        <div className="flex flex-wrap gap-2">
          {SLEEP_QUALITY_LEVELS.map((quality) => (
            <button
              key={quality}
              type="button"
              aria-pressed={state.sleepQuality === quality}
              // Pressing the active choice clears it, so a mis-tap can be taken
              // back without needing a separate "not recorded" option.
              onClick={() =>
                patch({
                  sleepQuality:
                    state.sleepQuality === quality ? null : (quality as SleepQuality),
                })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                state.sleepQuality === quality
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted",
              )}
            >
              {SLEEP_QUALITY_LABELS[quality]}
            </button>
          ))}
        </div>
      </div>
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
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Calculated from the times you entered
          </p>
          <p className="mt-1 text-lg font-semibold">
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
            <p className="text-muted-foreground mt-2 text-xs">
              Using this. Pick an option below to override it.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {DURATION_BANDS.map((band) => (
          <DurationChoice
            key={band.id}
            label={band.label}
            active={state.durationKind === "band" && state.durationBand === band.id}
            onClick={() => patch({ durationKind: "band", durationBand: band.id })}
          />
        ))}
        <DurationChoice
          label="Still ongoing"
          active={state.durationKind === "ongoing"}
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
        <DurationChoice
          label="Custom duration"
          active={state.durationKind === "custom"}
          onClick={() => patch({ durationKind: "custom" })}
        />
        <DurationChoice
          label="Unknown"
          active={state.durationKind === "unknown"}
          onClick={() => patch({ durationKind: "unknown" })}
        />
      </div>

      {state.durationKind === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-hours">Hours</Label>
            <Input
              id="custom-hours"
              type="number"
              inputMode="numeric"
              min={0}
              value={state.customHours}
              onChange={(event) => patch({ customHours: event.target.value })}
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-minutes">Minutes</Label>
            <Input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={state.customMinutes}
              onChange={(event) => patch({ customMinutes: event.target.value })}
              className="w-24"
            />
          </div>
          <p className="text-muted-foreground pb-2 text-sm">
            {formatDuration(customToMinutes(state)) ?? "Enter a duration"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DurationChoice({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function SeverityStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (changes: Partial<WizardState>) => void;
}) {
  const value = state.severity ?? 5;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">
          {state.severity ?? "—"}
        </span>
        <span className="text-muted-foreground text-sm">
          {state.severity === null
            ? "Not recorded"
            : `${SEVERITY_LABELS[state.severity]} · ${state.severity} of 10`}
        </span>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          aria-label="Pain severity from 1 to 10"
          onChange={(event) => patch({ severity: Number(event.target.value) })}
          className="accent-primary w-full"
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>1 · {SEVERITY_ANCHOR_LOW}</span>
          <span>10 · {SEVERITY_ANCHOR_HIGH}</span>
        </div>
      </div>

      {state.severity !== null ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => patch({ severity: null })}
        >
          Clear
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ severity: 5 })}
        >
          Record a severity
        </Button>
      )}
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
    {
      step: "timing",
      label: "Started",
      value: describeStart(state),
    },
    {
      step: "duration",
      label: "Duration",
      value: describeDuration(state),
    },
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
    {
      step: "symptoms",
      label: "Symptoms",
      value: <ValueChips values={state.symptoms} />,
    },
    {
      step: "triggers",
      label: "Possible triggers",
      value: <ValueChips values={state.possibleTriggers} />,
    },
    {
      step: "sleep",
      label: "Sleep",
      value: describeSleep(state),
    },
    {
      step: "medications",
      label: "Medication",
      value: describeMedications(state),
    },
    {
      step: "relief",
      label: "Relief methods",
      value: describeRelief(state),
    },
    {
      step: "notes",
      label: "Notes",
      value: state.notes.trim().length > 0 ? state.notes : "Not recorded",
    },
  ];

  return (
    <div className="space-y-4">
      <dl className="divide-y">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3"
          >
            <dt className="text-muted-foreground w-36 shrink-0 text-sm">
              {row.label}
            </dt>
            <dd className="min-w-0 flex-1 text-sm">{row.value}</dd>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onJump(STEPS.findIndex((step) => step.id === row.step))}
            >
              Edit
            </Button>
          </div>
        ))}
      </dl>

      {midasResult ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Activity impact</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onJump(STEPS.findIndex((step) => step.id === "midas"))}
            >
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
