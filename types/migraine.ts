import type {
  DurationKind,
  HelpedValue,
  TimePrecision,
} from "@/lib/migraines/catalog";
import type { MidasAnswers, MidasResult } from "@/lib/midas";

/**
 * A migraine episode as the rest of the application sees it.
 *
 * Instants are ISO strings rather than `Date` objects so a record can cross the
 * server/client boundary unchanged. See `lib/time.ts` for how the `*Local`
 * wall-clock fields relate to them.
 *
 * Almost everything is optional: an episode can be saved half-filled and
 * finished later, so only the start date is ever required.
 */
export type Migraine = {
  id: string;
  status: MigraineStatus;

  timing: MigraineTiming;
  duration: MigraineDuration;

  /** 1-10, or `null` when not recorded. */
  severity: number | null;
  /** Catalogue id or free text; `null` when not recorded. */
  headacheType: string | null;

  painLocations: string[];
  symptoms: string[];
  possibleTriggers: string[];

  medications: MigraineMedication[];
  reliefMethods: MigraineReliefMethod[];

  /** Raw MIDAS answers, preserved so the score can be recalculated. */
  midas: MidasAnswers | null;
  /** Derived from `midas` on read, never stored. */
  midasResult: MidasResult | null;

  notes: string | null;

  createdAt: string;
  updatedAt: string;
};

/** A draft is an episode saved before every question was answered. */
export type MigraineStatus = "draft" | "complete";

export type MigraineTiming = {
  /** ISO UTC instant of the start. */
  startedAt: string;
  /** Wall clock as entered, `"YYYY-MM-DDTHH:mm"`. */
  startedAtLocal: string;
  /**
   * How much to trust the time half of `startedAtLocal`. When `"unknown"`, the
   * date is meaningful but the time is a placeholder and must not be shown as
   * though it were recorded.
   */
  startPrecision: TimePrecision;

  endedAt: string | null;
  endedAtLocal: string | null;
  endPrecision: TimePrecision | null;

  timezoneOffsetMinutes: number;
};

/**
 * Duration is recorded one of several ways, and which one matters: a measured
 * duration and a chosen band should never be averaged as if they were the same
 * kind of number.
 */
export type MigraineDuration = {
  kind: DurationKind;
  /** Set when `kind` is `"band"`. */
  band: string | null;
  /** Exact minutes. Only ever set for `"calculated"` and `"custom"`. */
  minutes: number | null;
  /**
   * Best available number for charts and averages: the exact value when there
   * is one, otherwise the band's representative estimate.
   */
  estimateMinutes: number | null;
  /** True when `estimateMinutes` came from a band rather than a measurement. */
  isEstimate: boolean;
  /** Ready-to-display text, e.g. `"5 hours 32 minutes"` or `"2-4 hours"`. */
  label: string;
};

export type MigraineMedication = {
  /** Catalogue id or free text. */
  name: string;
  dosage: string | null;
  takenAtLocal: string | null;
  helped: HelpedValue | null;
  notes: string | null;
};

export type MigraineReliefMethod = {
  /** Catalogue id or free text. */
  method: string;
  helped: HelpedValue | null;
};

/** Filters supported by the history, calendar, and dashboard queries. */
export type MigraineFilter = {
  /** Inclusive local date bound, `"YYYY-MM-DD"`. */
  from?: string;
  /** Inclusive local date bound, `"YYYY-MM-DD"`. */
  to?: string;
  minSeverity?: number;
  maxSeverity?: number;
  /** Matches episodes carrying at least one of these symptoms. */
  symptoms?: string[];
  /** Matches episodes carrying at least one of these triggers. */
  possibleTriggers?: string[];
  headacheType?: string[];
  ongoing?: boolean;
  status?: MigraineStatus;
};

export type MigraineListOptions = MigraineFilter & {
  limit?: number;
  skip?: number;
  /** Defaults to newest first. */
  sort?: "newest" | "oldest";
};
