import "server-only";
import type { WithId } from "mongodb";
import type { MigraineInput } from "@/lib/validation/migraine";
import type { TimePrecision } from "@/lib/migraines/catalog";
import type { MidasAnswers } from "@/lib/midas";
import { scoreMidas } from "@/lib/midas";
import { resolveDuration, type StoredDuration } from "@/lib/migraines/duration";
import { localToInstant } from "@/lib/time";
import type {
  Migraine,
  MigraineMedication,
  MigraineReliefMethod,
  MigraineSleep,
  MigraineStatus,
} from "@/types/migraine";

export const MIGRAINES_COLLECTION = "migraines";

/**
 * How an episode is stored.
 *
 * One document per episode: symptoms, medications, and relief methods are
 * properties of the episode rather than entities in their own right, so
 * splitting them into their own collections would buy nothing. Answers are
 * stored as plain strings, which is what lets a custom "Other" answer live
 * beside a predefined one without a schema change.
 *
 * Nothing derivable is stored. Duration is expanded from its inputs, and the
 * MIDAS score is computed from the raw answers, so changing either calculation
 * re-derives the whole history rather than leaving stale values behind.
 */
export type MigraineDocument = {
  // `_id` is intentionally absent: the driver supplies it, and `WithId<T>` adds
  // it back wherever a document has actually been read from the collection.
  status: MigraineStatus;

  timing: {
    startedAt: Date;
    startedAtLocal: string;
    startPrecision: TimePrecision;
    endedAt: Date | null;
    endedAtLocal: string | null;
    endPrecision: TimePrecision | null;
    timezoneOffsetMinutes: number;
  };

  duration: StoredDuration;

  severity: number | null;
  headacheType: string | null;

  painLocations: string[];
  symptoms: string[];
  possibleTriggers: string[];

  medications: MigraineMedication[];
  reliefMethods: MigraineReliefMethod[];

  sleep: MigraineSleep | null;

  midas: MidasAnswers | null;

  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
};

/** The fields an episode's content owns - everything except the audit stamps. */
export type MigraineContent = Omit<MigraineDocument, "createdAt" | "updatedAt">;

/**
 * Validated input -> stored fields.
 *
 * This is the only place the wall clock and the UTC instant are derived from
 * one another, so the two can never disagree.
 */
export function toMigraineContent(input: MigraineInput): MigraineContent {
  const { timing } = input;
  const startedAt = localToInstant(
    timing.startedAtLocal,
    timing.timezoneOffsetMinutes,
  );
  const endedAt = timing.endedAtLocal
    ? localToInstant(timing.endedAtLocal, timing.timezoneOffsetMinutes)
    : null;

  return {
    status: input.status,

    timing: {
      startedAt,
      startedAtLocal: timing.startedAtLocal,
      startPrecision: timing.startPrecision,
      endedAt,
      endedAtLocal: timing.endedAtLocal,
      // An end precision without an end time is meaningless.
      endPrecision: timing.endedAtLocal ? (timing.endPrecision ?? "exact") : null,
      timezoneOffsetMinutes: timing.timezoneOffsetMinutes,
    },

    duration: {
      kind: input.duration.kind,
      band: input.duration.kind === "band" ? input.duration.band : null,
      customMinutes:
        input.duration.kind === "custom" ? input.duration.customMinutes : null,
    },

    severity: input.severity,
    headacheType: input.headacheType,

    painLocations: input.painLocations,
    symptoms: input.symptoms,
    possibleTriggers: input.possibleTriggers,

    medications: input.medications,
    reliefMethods: input.reliefMethods,

    // An all-blank sleep record carries no information; storing null keeps
    // "not recorded" a single unambiguous shape.
    sleep: emptySleepToNull(input.sleep),

    midas: input.midas,

    notes: input.notes,
  };
}

function emptySleepToNull(sleep: MigraineSleep | null): MigraineSleep | null {
  if (sleep === null) return null;
  return sleep.durationHours === null && sleep.quality === null ? null : sleep;
}

/** Stored document -> the shape the rest of the app consumes. */
export function toMigraine(document: WithId<MigraineDocument>): Migraine {
  return {
    id: document._id.toHexString(),
    status: document.status,

    timing: {
      startedAt: document.timing.startedAt.toISOString(),
      startedAtLocal: document.timing.startedAtLocal,
      startPrecision: document.timing.startPrecision,
      endedAt: document.timing.endedAt?.toISOString() ?? null,
      endedAtLocal: document.timing.endedAtLocal,
      endPrecision: document.timing.endPrecision,
      timezoneOffsetMinutes: document.timing.timezoneOffsetMinutes,
    },

    duration: resolveDuration(document.duration, {
      startedAt: document.timing.startedAt,
      endedAt: document.timing.endedAt,
    }),

    severity: document.severity,
    headacheType: document.headacheType,

    painLocations: document.painLocations,
    symptoms: document.symptoms,
    possibleTriggers: document.possibleTriggers,

    medications: document.medications,
    reliefMethods: document.reliefMethods,

    sleep: document.sleep ?? null,

    midas: document.midas,
    midasResult: scoreMidas(document.midas),

    notes: document.notes,

    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
