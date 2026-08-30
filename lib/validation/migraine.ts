import { z } from "zod";
import {
  DURATION_BANDS,
  DURATION_KINDS,
  HELPED_VALUES,
  MAX_SEVERITY,
  MAX_SLEEP_HOURS,
  MIN_SEVERITY,
  SLEEP_QUALITY_LEVELS,
  TIME_PRECISIONS,
} from "@/lib/migraines/catalog";
import { MIDAS_RECALL_DAYS } from "@/lib/midas";
import { isValidLocalDate, isValidLocalDateTime, localToInstant } from "@/lib/time";

/**
 * Validation for episode input.
 *
 * Two rules run through all of it:
 *
 *  - Blank means "not recorded". Empty and whitespace-only text normalises to
 *    `null`, so an untouched field never stores an empty string that later has
 *    to be special-cased in every display and every statistic.
 *  - Only the start date is required. Everything else may be left out, because
 *    a half-filled episode must still be savable as a draft.
 *
 * The schema works on domain values rather than raw `FormData` strings; the
 * form adapter converts before validating.
 */

const optionalText = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

const requiredText = z.string().trim().min(1, { error: "This field is required." });

const localDateTime = z.string().refine(isValidLocalDateTime, {
  error: "Expected a local date and time like 2026-08-30T14:30.",
});

const optionalLocalDateTime = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : null))
  .refine((value) => value === null || isValidLocalDateTime(value), {
    error: "Expected a local date and time like 2026-08-30T14:30.",
  });

export const localDateSchema = z.string().refine(isValidLocalDate, {
  error: "Expected a local date like 2026-08-30.",
});

/**
 * A multi-select answer. Holds catalogue ids and free-text "Other" entries
 * side by side, de-duplicated, with blanks dropped.
 */
const answerList = z
  .array(z.string())
  .default([])
  .transform((values) => {
    const seen = new Set<string>();
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed.length > 0) seen.add(trimmed);
    }
    return [...seen];
  });

export const severitySchema = z
  .number()
  .int({ error: "Severity must be a whole number." })
  .min(MIN_SEVERITY, { error: `Severity must be at least ${MIN_SEVERITY}.` })
  .max(MAX_SEVERITY, { error: `Severity must be at most ${MAX_SEVERITY}.` });

const helpedSchema = z
  .enum(HELPED_VALUES)
  .nullish()
  .transform((value) => value ?? null);

const midasDays = z
  .number()
  .int({ error: "Enter a whole number of days." })
  .min(0, { error: "Days cannot be negative." })
  .max(MIDAS_RECALL_DAYS, {
    error: `Cannot exceed ${MIDAS_RECALL_DAYS} days in a 3-month period.`,
  })
  .nullish()
  .transform((value) => value ?? null);

// --- Sections ---------------------------------------------------------------

export const timingSchema = z
  .object({
    startedAtLocal: localDateTime,
    startPrecision: z.enum(TIME_PRECISIONS).default("exact"),
    endedAtLocal: optionalLocalDateTime,
    endPrecision: z
      .enum(TIME_PRECISIONS)
      .nullish()
      .transform((value) => value ?? null),
    // getTimezoneOffset() convention. Plus or minus 14h covers every real zone.
    timezoneOffsetMinutes: z
      .number()
      .int()
      .min(-840, { error: "Invalid timezone offset." })
      .max(840, { error: "Invalid timezone offset." }),
  })
  .refine(
    (value) =>
      value.endedAtLocal === null ||
      localToInstant(value.endedAtLocal, value.timezoneOffsetMinutes) >=
        localToInstant(value.startedAtLocal, value.timezoneOffsetMinutes),
    {
      error: "The episode cannot end before it started.",
      path: ["endedAtLocal"],
    },
  );

const bandIds = DURATION_BANDS.map((band) => band.id) as [string, ...string[]];

export const durationSchema = z
  .object({
    kind: z.enum(DURATION_KINDS).default("unknown"),
    band: optionalText,
    customMinutes: z
      .number()
      .int({ error: "Enter a whole number of minutes." })
      .min(1, { error: "Duration must be at least a minute." })
      // A single episode lasting over a month is a data-entry error.
      .max(60 * 24 * 30, { error: "Duration is implausibly long." })
      .nullish()
      .transform((value) => value ?? null),
  })
  // Each kind carries exactly the field it needs, so a stored duration can
  // never claim to be a band without saying which one.
  .refine((value) => value.kind !== "band" || (value.band !== null && bandIds.includes(value.band)), {
    error: "Choose one of the listed duration ranges.",
    path: ["band"],
  })
  .refine((value) => value.kind !== "custom" || value.customMinutes !== null, {
    error: "Enter how long the episode lasted.",
    path: ["customMinutes"],
  });

export const medicationSchema = z.object({
  name: requiredText,
  dosage: optionalText,
  takenAtLocal: optionalLocalDateTime,
  helped: helpedSchema,
  notes: optionalText,
});

export const sleepSchema = z
  .object({
    durationHours: z
      .number()
      .min(0, { error: "Sleep cannot be negative." })
      .max(MAX_SLEEP_HOURS, { error: `Sleep cannot exceed ${MAX_SLEEP_HOURS} hours.` })
      .nullish()
      .transform((value) => value ?? null),
    quality: z
      .enum(SLEEP_QUALITY_LEVELS)
      .nullish()
      .transform((value) => value ?? null),
  })
  .nullish()
  .transform((value) => value ?? null);

export const reliefMethodSchema = z.object({
  method: requiredText,
  helped: helpedSchema,
});

export const midasAnswersSchema = z.object({
  workDaysMissed: midasDays,
  workDaysReduced: midasDays,
  householdDaysMissed: midasDays,
  householdDaysReduced: midasDays,
  leisureDaysMissed: midasDays,
  leisureDaysReduced: midasDays,
  headacheDays: midasDays,
  averagePainSeverity: z
    .number()
    .int({ error: "Enter a whole number." })
    .min(0)
    .max(10, { error: "Use a 0-10 scale." })
    .nullish()
    .transform((value) => value ?? null),
});

// --- Episode ----------------------------------------------------------------

export const migraineInputSchema = z
  .object({
    status: z.enum(["draft", "complete"]).default("complete"),

    timing: timingSchema,
    duration: durationSchema.default({
      kind: "unknown",
      band: null,
      customMinutes: null,
    }),

    severity: severitySchema.nullish().transform((value) => value ?? null),
    headacheType: optionalText,

    painLocations: answerList,
    symptoms: answerList,
    possibleTriggers: answerList,

    medications: z.array(medicationSchema).default([]),
    reliefMethods: z.array(reliefMethodSchema).default([]),

    sleep: sleepSchema,

    midas: midasAnswersSchema
      .nullish()
      .transform((value) => value ?? null),

    notes: optionalText,
  })
  .refine(
    // A measured duration needs both ends of the episode to exist.
    (value) => value.duration.kind !== "calculated" || value.timing.endedAtLocal !== null,
    {
      error: "Record an end time, or choose how long the episode lasted.",
      path: ["duration", "kind"],
    },
  )
  .refine(
    // "Still ongoing" and a recorded end time contradict each other.
    (value) => value.duration.kind !== "ongoing" || value.timing.endedAtLocal === null,
    {
      error: "An ongoing episode cannot have an end time.",
      path: ["duration", "kind"],
    },
  );

/** What callers pass in. */
export type MigraineInputRaw = z.input<typeof migraineInputSchema>;
/** What comes out - every optional value normalised to `null` or `[]`. */
export type MigraineInput = z.output<typeof migraineInputSchema>;

export const migraineFilterSchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  minSeverity: severitySchema.optional(),
  maxSeverity: severitySchema.optional(),
  symptoms: z.array(z.string()).optional(),
  possibleTriggers: z.array(z.string()).optional(),
  headacheType: z.array(z.string()).optional(),
  ongoing: z.boolean().optional(),
  status: z.enum(["draft", "complete"]).optional(),
});
