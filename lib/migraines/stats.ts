import { labelFor } from "@/lib/migraines/catalog";
import type { HelpedValue } from "@/lib/migraines/catalog";
import { WEEKDAY_HEADERS, todayLocalDate } from "@/lib/migraines/calendar";
import { localParts } from "@/lib/time";
import type { Migraine } from "@/types/migraine";

/**
 * Statistics over recorded episodes.
 *
 * Pure functions over an array, deliberately kept out of the UI so they can be
 * checked on their own. Two rules run through all of them:
 *
 *  - **Not recorded is never zero.** An episode with no severity is excluded
 *    from the severity average rather than counted as a 0, and the count of
 *    what was excluded is always reported alongside the figure.
 *  - **A guess is never averaged with a measurement.** Durations chosen as a
 *    band ("2-4 hours") are reported separately from measured ones, so an
 *    average never quietly blends the two.
 *
 * Drafts are included in counts: a draft is an episode that happened, it just
 * has unanswered questions. Its blank fields drop out of the averages by the
 * first rule above.
 */

// --- Period counts ----------------------------------------------------------

export type PeriodCounts = {
  total: number;
  /** Calendar week, starting Monday - the same week the calendar draws. */
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
};

export function periodCounts(
  episodes: Migraine[],
  today: Date = new Date(),
): PeriodCounts {
  const todayDate = todayLocalDate(today);
  const weekStart = startOfWeek(todayDate);
  const monthPrefix = todayDate.slice(0, 7);
  const yearPrefix = todayDate.slice(0, 4);

  const counts: PeriodCounts = {
    total: episodes.length,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
  };

  for (const episode of episodes) {
    const date = episode.timing.startedAtLocal.slice(0, 10);
    // Bounded above by today so a mistyped future date cannot inflate a period.
    if (date > todayDate) continue;
    if (date >= weekStart) counts.thisWeek += 1;
    if (date.startsWith(monthPrefix)) counts.thisMonth += 1;
    if (date.startsWith(yearPrefix)) counts.thisYear += 1;
  }

  return counts;
}

/** Monday of the week containing `date`, as `"YYYY-MM-DD"`. */
export function startOfWeek(date: string): string {
  const stamp = new Date(`${date}T00:00:00.000Z`);
  // getUTCDay: 0 = Sunday. Monday-based offset puts Sunday six days after.
  const offset = (stamp.getUTCDay() + 6) % 7;
  stamp.setUTCDate(stamp.getUTCDate() - offset);
  return stamp.toISOString().slice(0, 10);
}

// --- Severity ---------------------------------------------------------------

export type SeverityStats = {
  recordedCount: number;
  missingCount: number;
  /** Mean of recorded values only, or `null` when none were recorded. */
  average: number | null;
  /** Counts for 1-10, always all ten entries so the chart has a stable axis. */
  distribution: { severity: number; count: number }[];
};

export function severityStats(episodes: Migraine[]): SeverityStats {
  const recorded = episodes
    .map((episode) => episode.severity)
    .filter((severity): severity is number => severity !== null);

  const distribution = Array.from({ length: 10 }, (_, index) => ({
    severity: index + 1,
    count: recorded.filter((value) => value === index + 1).length,
  }));

  return {
    recordedCount: recorded.length,
    missingCount: episodes.length - recorded.length,
    average: recorded.length > 0 ? mean(recorded) : null,
    distribution,
  };
}

// --- Duration ---------------------------------------------------------------

export type DurationStats = {
  /** Episodes with a measured or explicitly entered duration. */
  measuredCount: number;
  /** Episodes where only a band was chosen. */
  estimatedCount: number;
  ongoingCount: number;
  unknownCount: number;
  /** Mean over measured durations only. */
  averageMeasuredMinutes: number | null;
  /** Mean over measured durations plus band midpoints - a rougher figure. */
  averageWithEstimatesMinutes: number | null;
};

export function durationStats(episodes: Migraine[]): DurationStats {
  const measured: number[] = [];
  const estimates: number[] = [];
  let ongoingCount = 0;
  let unknownCount = 0;

  for (const { duration } of episodes) {
    if (duration.kind === "ongoing") ongoingCount += 1;
    else if (duration.minutes !== null) measured.push(duration.minutes);
    else if (duration.estimateMinutes !== null) estimates.push(duration.estimateMinutes);
    else unknownCount += 1;
  }

  const combined = [...measured, ...estimates];

  return {
    measuredCount: measured.length,
    estimatedCount: estimates.length,
    ongoingCount,
    unknownCount,
    averageMeasuredMinutes: measured.length > 0 ? Math.round(mean(measured)) : null,
    averageWithEstimatesMinutes:
      combined.length > 0 ? Math.round(mean(combined)) : null,
  };
}

// --- Frequency --------------------------------------------------------------

export type FrequencyEntry = {
  value: string;
  label: string;
  count: number;
  /** Share of episodes carrying this value, 0-1. */
  share: number;
};

/**
 * How often each answer was recorded, most frequent first.
 *
 * The denominator is the number of episodes, not the number of selections, so
 * "recorded alongside 6 of 10 episodes" is a statement about episodes. Ties
 * break alphabetically so the order does not wobble between renders.
 */
export function frequency(
  episodes: Migraine[],
  pick: (episode: Migraine) => string[],
  limit?: number,
): FrequencyEntry[] {
  const counts = new Map<string, number>();

  for (const episode of episodes) {
    // A value selected twice on one episode still counts once for that episode.
    for (const value of new Set(pick(episode))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const entries = [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: labelFor(value),
      count,
      share: episodes.length > 0 ? count / episodes.length : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return limit === undefined ? entries : entries.slice(0, limit);
}

// --- Over time --------------------------------------------------------------

export type MonthPoint = {
  /** `"2026-08"` */
  key: string;
  /** `"Aug"`, with the year appended in January and in the first bucket. */
  label: string;
  year: number;
  count: number;
  /** Distinct days that month carrying an episode - see `episodeDays`. */
  headacheDays: number;
  /** Mean severity that month over recorded values only. */
  averageSeverity: number | null;
};

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * The last `months` calendar months ending with the current one.
 *
 * Months with no episodes are present with a count of 0 - a gap in the record
 * is information, and dropping empty buckets would compress the time axis and
 * make a quiet stretch look like a busy one.
 */
export function monthlySeries(
  episodes: Migraine[],
  months: number,
  today: Date = new Date(),
): MonthPoint[] {
  type MonthBucket = { count: number; days: Set<string>; severities: number[] };
  const byMonth = new Map<string, MonthBucket>();

  for (const episode of episodes) {
    const local = episode.timing.startedAtLocal;
    const key = local.slice(0, 7);
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = { count: 0, days: new Set(), severities: [] };
      byMonth.set(key, bucket);
    }
    bucket.count += 1;
    bucket.days.add(local.slice(0, 10));
    if (episode.severity !== null) bucket.severities.push(episode.severity);
  }

  const points: MonthPoint[] = [];
  const year = today.getFullYear();
  const month = today.getMonth();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const stamp = new Date(Date.UTC(year, month - offset, 1));
    const pointYear = stamp.getUTCFullYear();
    const pointMonth = stamp.getUTCMonth();
    const key = `${pointYear}-${String(pointMonth + 1).padStart(2, "0")}`;

    const bucket = byMonth.get(key);

    points.push({
      key,
      label: MONTH_ABBR[pointMonth],
      year: pointYear,
      count: bucket?.count ?? 0,
      headacheDays: bucket?.days.size ?? 0,
      averageSeverity:
        bucket && bucket.severities.length > 0 ? mean(bucket.severities) : null,
    });
  }

  return points;
}

// --- Days with an episode ---------------------------------------------------

/**
 * The distinct local dates carrying at least one episode, ascending.
 *
 * Counting episodes and counting days answer different questions: two episodes
 * on one day are two episodes but one day of headache. Everything that speaks
 * about days is built on this, never on the episode count.
 */
export function episodeDays(episodes: Migraine[]): string[] {
  return [...new Set(episodes.map(localDateOf))].sort();
}

export type GapStats = {
  /** Local date of the most recent episode, or `null` when there are none. */
  lastDate: string | null;
  /** Whole days from that date to today; `null` when nothing was recorded. */
  daysSinceLast: number | null;
  /** The longest run of consecutive clear days, current run included. */
  longestClearRun: number;
  /** True when the run since the last episode is that longest run. */
  currentIsLongest: boolean;
};

/**
 * How long it has been, and how long it has ever been.
 *
 * A clear run counts the days with nothing recorded between two episode days,
 * so back-to-back days give a run of 0 rather than 1. Dates after today are
 * ignored throughout, so a mistyped future date cannot report a negative gap or
 * hide the real one.
 */
export function gapStats(
  episodes: Migraine[],
  today: Date = new Date(),
): GapStats {
  const todayDate = todayLocalDate(today);
  const days = episodeDays(episodes).filter((date) => date <= todayDate);

  if (days.length === 0) {
    return {
      lastDate: null,
      daysSinceLast: null,
      longestClearRun: 0,
      currentIsLongest: false,
    };
  }

  const lastDate = days[days.length - 1];
  const daysSinceLast = daysBetween(lastDate, todayDate);

  let longestPastRun = 0;
  for (let index = 1; index < days.length; index += 1) {
    const clear = daysBetween(days[index - 1], days[index]) - 1;
    if (clear > longestPastRun) longestPastRun = clear;
  }

  return {
    lastDate,
    daysSinceLast,
    longestClearRun: Math.max(longestPastRun, daysSinceLast),
    // A run of 0 days is not a stretch worth calling the longest one.
    currentIsLongest: daysSinceLast > 0 && daysSinceLast >= longestPastRun,
  };
}

export type WindowComparison = {
  windowDays: number;
  /** Episodes in the last `windowDays` days, today included. */
  current: number;
  /** Episodes in the `windowDays` days before that. */
  previous: number;
  /** `current - previous`. */
  change: number;
  /**
   * False when the record does not reach back far enough to cover the earlier
   * window. A comparison against a period you were not yet logging says nothing
   * about how often episodes happened, only about how long you have been
   * writing them down.
   */
  previousWindowCovered: boolean;
};

/** Two adjacent windows of equal length, the later one ending today. */
export function windowComparison(
  episodes: Migraine[],
  windowDays: number,
  today: Date = new Date(),
): WindowComparison {
  const todayDate = todayLocalDate(today);
  const currentFrom = shiftDate(todayDate, -(windowDays - 1));
  const previousFrom = shiftDate(currentFrom, -windowDays);

  let current = 0;
  let previous = 0;

  for (const episode of episodes) {
    const date = localDateOf(episode);
    if (date > todayDate) continue;
    if (date >= currentFrom) current += 1;
    else if (date >= previousFrom) previous += 1;
  }

  const earliest = episodeDays(episodes).find((date) => date <= todayDate);

  return {
    windowDays,
    current,
    previous,
    change: current - previous,
    previousWindowCovered: earliest !== undefined && earliest <= previousFrom,
  };
}

export type RollingPoint = {
  /** The local date the window ends on, `"YYYY-MM-DD"`. */
  date: string;
  /** Episodes in the `windowDays` ending on `date`, inclusive. */
  count: number;
  /** Distinct days among them - see `episodeDays`. */
  headacheDays: number;
};

/**
 * A rolling count of episodes, sampled weekly and ending today.
 *
 * Calendar months are an arbitrary place to cut a run of migraines: a bad
 * fortnight spanning the 28th to the 12th shows up as two unremarkable months.
 * A window that slides day by day has no edges to hide behind, which is what
 * makes this the one figure here worth drawing as a line.
 *
 * Only windows lying entirely inside the record are returned. A window reaching
 * back past the first episode would count the days before you were logging as
 * quiet ones, and the series would open with a rise that is just the record
 * starting - the opposite of what a reader would take from it.
 */
export function rollingWindowSeries(
  episodes: Migraine[],
  windowDays: number,
  weeks: number,
  today: Date = new Date(),
): RollingPoint[] {
  const todayDate = todayLocalDate(today);
  const dates = episodes
    .map(localDateOf)
    .filter((date) => date <= todayDate)
    .sort();

  if (dates.length === 0) return [];
  const firstDate = dates[0];

  const points: RollingPoint[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const end = shiftDate(todayDate, -index * 7);
    const start = shiftDate(end, -(windowDays - 1));
    if (start < firstDate) continue;

    const inWindow = dates.filter((date) => date >= start && date <= end);
    points.push({
      date: end,
      count: inWindow.length,
      headacheDays: new Set(inWindow).size,
    });
  }

  return points;
}

export type MedicationDays = {
  windowDays: number;
  /** Distinct days in the window with a medication recorded. */
  days: number;
  /** Episodes in the window, so the figure has a denominator. */
  episodes: number;
};

/**
 * Days in the window on which any medication was recorded.
 *
 * Counted in days rather than in doses, and reported as a plain count with no
 * threshold attached: how many is too many is a question for a clinician, and
 * this app does not answer it.
 */
export function medicationDays(
  episodes: Migraine[],
  windowDays: number,
  today: Date = new Date(),
): MedicationDays {
  const todayDate = todayLocalDate(today);
  const from = shiftDate(todayDate, -(windowDays - 1));
  const days = new Set<string>();
  let inWindow = 0;

  for (const episode of episodes) {
    const date = localDateOf(episode);
    if (date > todayDate || date < from) continue;
    inWindow += 1;
    if (episode.medications.length > 0) days.add(date);
  }

  return { windowDays, days: days.size, episodes: inWindow };
}

// --- Patterns ---------------------------------------------------------------

export type DistributionPoint = {
  key: string;
  label: string;
  count: number;
};

/**
 * Episodes per weekday, Monday first so the axis matches the calendar.
 *
 * The start date is always recorded, so every episode is counted here - unlike
 * the time of day below, this one has nothing to exclude.
 */
export function weekdayDistribution(episodes: Migraine[]): DistributionPoint[] {
  const counts = new Array<number>(7).fill(0);
  for (const episode of episodes) counts[weekdayOf(episode)] += 1;

  // 1..6,0 walks Monday to Sunday over weekdayOf's Sunday-first indices.
  return [1, 2, 3, 4, 5, 6, 0].map((weekday, position) => ({
    key: String(weekday),
    label: WEEKDAY_HEADERS[position],
    count: counts[weekday],
  }));
}

export type TimeBucket = {
  id: string;
  /** Axis label, e.g. `"Morning"`. */
  label: string;
  /** The same bucket inside a sentence, e.g. `"in the morning"`. */
  phrase: string;
  /** Inclusive hour bounds, 0-23. */
  from: number;
  to: number;
};

export const TIME_BUCKETS: readonly TimeBucket[] = [
  { id: "night", label: "Night", phrase: "at night", from: 0, to: 5 },
  { id: "morning", label: "Morning", phrase: "in the morning", from: 6, to: 11 },
  { id: "afternoon", label: "Afternoon", phrase: "in the afternoon", from: 12, to: 17 },
  { id: "evening", label: "Evening", phrase: "in the evening", from: 18, to: 23 },
] as const;

export type TimeOfDayStats = {
  buckets: (DistributionPoint & { phrase: string })[];
  /** Episodes whose start time was actually recorded. */
  recordedCount: number;
  /** Episodes excluded because their stored time is a placeholder. */
  unknownCount: number;
};

/**
 * When in the day episodes started.
 *
 * Episodes whose `startPrecision` is `"unknown"` are excluded outright: their
 * stored time is a placeholder, and bucketing it would invent a pattern out of
 * whatever the form happened to default to.
 */
export function timeOfDayDistribution(episodes: Migraine[]): TimeOfDayStats {
  const timed = episodes.filter(
    (episode) => episode.timing.startPrecision !== "unknown",
  );

  const buckets = TIME_BUCKETS.map((bucket) => ({
    key: bucket.id,
    label: bucket.label,
    phrase: bucket.phrase,
    count: timed.filter((episode) => {
      const { hour } = localParts(episode.timing.startedAtLocal);
      return hour >= bucket.from && hour <= bucket.to;
    }).length,
  }));

  return {
    buckets,
    recordedCount: timed.length,
    unknownCount: episodes.length - timed.length,
  };
}

/** Upper bound in minutes, exclusive; the last bucket is open-ended. */
const DURATION_BUCKETS = [
  { id: "under-1h", label: "<1h", limit: 60 },
  { id: "1-4h", label: "1-4h", limit: 4 * 60 },
  { id: "4-12h", label: "4-12h", limit: 12 * 60 },
  { id: "12-24h", label: "12-24h", limit: 24 * 60 },
  { id: "over-24h", label: "24h+", limit: Number.POSITIVE_INFINITY },
] as const;

export type DurationDistribution = {
  buckets: DistributionPoint[];
  measuredCount: number;
  /** Everything below is excluded from the buckets, never drawn as a zero. */
  estimatedCount: number;
  ongoingCount: number;
  unknownCount: number;
};

/**
 * How long measured episodes lasted.
 *
 * Band selections are left out rather than dropped into whichever bucket their
 * midpoint lands in: "2-4 hours" is an answer about a range, and putting it on
 * a bar would show it as a measurement. The counts of what was left out travel
 * with the figure so the missing episodes stay visible.
 */
export function durationDistribution(episodes: Migraine[]): DurationDistribution {
  const counts = new Map<string, number>(
    DURATION_BUCKETS.map((bucket) => [bucket.id, 0]),
  );

  let measuredCount = 0;
  let estimatedCount = 0;
  let ongoingCount = 0;
  let unknownCount = 0;

  for (const { duration } of episodes) {
    if (duration.kind === "ongoing") {
      ongoingCount += 1;
      continue;
    }

    const minutes = duration.minutes;
    if (minutes === null) {
      if (duration.estimateMinutes !== null) estimatedCount += 1;
      else unknownCount += 1;
      continue;
    }

    const bucket =
      DURATION_BUCKETS.find((candidate) => minutes < candidate.limit) ??
      DURATION_BUCKETS[DURATION_BUCKETS.length - 1];
    counts.set(bucket.id, (counts.get(bucket.id) ?? 0) + 1);
    measuredCount += 1;
  }

  return {
    buckets: DURATION_BUCKETS.map((bucket) => ({
      key: bucket.id,
      label: bucket.label,
      count: counts.get(bucket.id) ?? 0,
    })),
    measuredCount,
    estimatedCount,
    ongoingCount,
    unknownCount,
  };
}

// --- What was noted as helping ----------------------------------------------

export type HelpedTally = {
  /** Catalogue id or free text, as recorded. */
  key: string;
  total: number;
  yes: number;
  no: number;
  unsure: number;
  /** Recorded, but with nothing said about whether it helped. */
  unrecorded: number;
};

/**
 * Tallies what was noted about each medication or relief method.
 *
 * This counts notes, not outcomes. "3 noted as helped" is a fact about what was
 * written down; it is not a measure of whether the thing works, and nothing
 * built on it may present it as one.
 */
export function helpedTallies(
  entries: { key: string; helped: HelpedValue | null }[],
): HelpedTally[] {
  const byKey = new Map<string, HelpedTally>();

  for (const entry of entries) {
    const tally =
      byKey.get(entry.key) ??
      { key: entry.key, total: 0, yes: 0, no: 0, unsure: 0, unrecorded: 0 };
    tally.total += 1;
    if (entry.helped === "yes") tally.yes += 1;
    else if (entry.helped === "no") tally.no += 1;
    else if (entry.helped === "unsure") tally.unsure += 1;
    else tally.unrecorded += 1;
    byKey.set(entry.key, tally);
  }

  return [...byKey.values()].sort(
    (a, b) => b.total - a.total || a.key.localeCompare(b.key),
  );
}

// --- Recent -----------------------------------------------------------------

export function recentEpisodes(episodes: Migraine[], limit: number): Migraine[] {
  return [...episodes]
    .sort((a, b) =>
      b.timing.startedAtLocal.localeCompare(a.timing.startedAtLocal),
    )
    .slice(0, limit);
}

export function ongoingEpisodes(episodes: Migraine[]): Migraine[] {
  return episodes.filter((episode) => episode.duration.kind === "ongoing");
}

/** Day-of-week index (0 = Sunday) for an episode, from its local start date. */
export function weekdayOf(episode: Migraine): number {
  return localParts(episode.timing.startedAtLocal).weekday;
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function localDateOf(episode: Migraine): string {
  return episode.timing.startedAtLocal.slice(0, 10);
}

/** Whole days from one `"YYYY-MM-DD"` to another; negative when `to` is earlier. */
function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000);
}

function shiftDate(date: string, days: number): string {
  const stamp = new Date(`${date}T00:00:00.000Z`);
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10);
}
