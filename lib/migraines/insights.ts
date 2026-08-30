import {
  HELPED_LABELS,
  SLEEP_QUALITY_LABELS,
  labelFor,
} from "@/lib/migraines/catalog";
import { todayLocalDate } from "@/lib/migraines/calendar";
import {
  durationStats,
  frequency,
  severityStats,
  weekdayOf,
} from "@/lib/migraines/stats";
import { formatDuration } from "@/lib/time";
import { localParts } from "@/lib/time";
import type { Migraine } from "@/types/migraine";

/**
 * Deterministic insights over recorded episodes.
 *
 * Everything here **describes what was recorded**. Nothing infers a cause, and
 * the wording is chosen to make that impossible to misread: a trigger is
 * "recorded alongside" episodes, never said to have produced one. There is no
 * diagnosis, no advice, and no treatment recommendation anywhere in this file.
 *
 * Three rules keep the statements honest:
 *
 *  - **A pattern claim needs enough episodes.** Below `MIN_PATTERN_BASIS`,
 *    "most episodes start in the morning" is noise, so the insight is withheld
 *    rather than shown with a caveat nobody reads.
 *  - **Every statement names what it is based on.** A figure computed over 6 of
 *    20 episodes says so.
 *  - **Missing data is excluded, never assumed.** Episodes with no recorded
 *    time are left out of the time-of-day insight instead of being bucketed
 *    into whatever their placeholder happens to be.
 */

/** Below this, a "most common X" claim is not worth making. */
export const MIN_PATTERN_BASIS = 5;

export type Insight = {
  id: string;
  /** The descriptive statement itself. */
  statement: string;
  /** What the statement was computed over. */
  basis?: string;
};

export type InsightSection = {
  id: string;
  title: string;
  insights: Insight[];
  /** Explains why a section is empty, when it is. */
  note?: string;
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

type TimeBucket = { id: string; label: string; from: number; to: number };

const TIME_BUCKETS: readonly TimeBucket[] = [
  { id: "night", label: "at night", from: 0, to: 5 },
  { id: "morning", label: "in the morning", from: 6, to: 11 },
  { id: "afternoon", label: "in the afternoon", from: 12, to: 17 },
  { id: "evening", label: "in the evening", from: 18, to: 23 },
] as const;

export function buildInsights(
  episodes: Migraine[],
  today: Date = new Date(),
): InsightSection[] {
  return [
    recordSection(episodes, today),
    frequencySection(episodes),
    severitySection(episodes),
    durationSection(episodes),
    sleepSection(episodes),
    recordedAlongsideSection(episodes),
    respondedSection(episodes),
  ];
}

// --- What you have recorded -------------------------------------------------

function recordSection(episodes: Migraine[], today: Date): InsightSection {
  const insights: Insight[] = [];

  if (episodes.length === 0) {
    return {
      id: "record",
      title: "What you have recorded",
      insights,
      note: "Nothing has been logged yet.",
    };
  }

  const dates = episodes
    .map((episode) => episode.timing.startedAtLocal.slice(0, 10))
    .sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  insights.push({
    id: "total",
    statement:
      episodes.length === 1
        ? "You have recorded 1 episode."
        : `You have recorded ${episodes.length} episodes.`,
    basis:
      first === last
        ? `On ${describeDate(first)}.`
        : `Between ${describeDate(first)} and ${describeDate(last)}.`,
  });

  const drafts = episodes.filter((episode) => episode.status === "draft").length;
  if (drafts > 0) {
    insights.push({
      id: "drafts",
      statement:
        drafts === 1
          ? "1 of them is still a draft with unanswered questions."
          : `${drafts} of them are still drafts with unanswered questions.`,
      basis: "Drafts are counted in every figure here; their blank fields are not.",
    });
  }

  const monthsCovered = monthSpan(first, todayLocalDate(today));
  if (monthsCovered >= 2) {
    const perMonth = episodes.length / monthsCovered;
    insights.push({
      id: "per-month",
      statement: `That is ${perMonth.toFixed(1)} episodes per month on average.`,
      basis: `Over the ${monthsCovered} months from ${describeMonth(first)} to ${describeMonth(todayLocalDate(today))}, including months with none recorded.`,
    });
  }

  return { id: "record", title: "What you have recorded", insights };
}

// --- When episodes were recorded --------------------------------------------

function frequencySection(episodes: Migraine[]): InsightSection {
  const insights: Insight[] = [];

  if (episodes.length < MIN_PATTERN_BASIS) {
    return {
      id: "when",
      title: "When episodes were recorded",
      insights,
      note: `These need at least ${MIN_PATTERN_BASIS} episodes before they say anything meaningful. You have ${episodes.length}.`,
    };
  }

  // Busiest month.
  const byMonth = new Map<string, number>();
  for (const episode of episodes) {
    const key = episode.timing.startedAtLocal.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const busiest = [...byMonth.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0];
  if (busiest) {
    insights.push({
      id: "busiest-month",
      statement: `The most episodes you recorded in one month was ${busiest[1]}, in ${describeMonth(`${busiest[0]}-01`)}.`,
    });
  }

  // Day of week. The date is always known, so every episode counts.
  const weekdayCounts = new Array(7).fill(0) as number[];
  for (const episode of episodes) weekdayCounts[weekdayOf(episode)] += 1;
  const topWeekday = Math.max(...weekdayCounts);
  const topDays = WEEKDAY_NAMES.filter((_, index) => weekdayCounts[index] === topWeekday);

  if (topWeekday > 0) {
    insights.push({
      id: "weekday",
      statement:
        topDays.length === 1
          ? `More episodes started on a ${topDays[0]} than on any other day.`
          : `${joinList(topDays)} are tied for the most episodes.`,
      basis: `${topWeekday} of ${episodes.length} episodes.`,
    });
  }

  // Time of day. Episodes whose time was not recorded are excluded outright -
  // their stored time is a placeholder and bucketing it would invent a pattern.
  const timed = episodes.filter(
    (episode) => episode.timing.startPrecision !== "unknown",
  );
  const untimed = episodes.length - timed.length;

  if (timed.length >= MIN_PATTERN_BASIS) {
    const bucketCounts = TIME_BUCKETS.map(
      (bucket) =>
        timed.filter((episode) => {
          const { hour } = localParts(episode.timing.startedAtLocal);
          return hour >= bucket.from && hour <= bucket.to;
        }).length,
    );
    const topCount = Math.max(...bucketCounts);
    const topBuckets = TIME_BUCKETS.filter(
      (_, index) => bucketCounts[index] === topCount,
    );

    insights.push({
      id: "time-of-day",
      statement:
        topBuckets.length === 1
          ? `More episodes started ${topBuckets[0].label} than at any other time.`
          : `Episodes were evenly split ${joinList(topBuckets.map((bucket) => bucket.label))}.`,
      basis: `${topCount} of ${timed.length} episodes with a recorded time${
        untimed > 0
          ? `; ${untimed} without a recorded time excluded`
          : ""
      }.`,
    });
  } else if (untimed > 0) {
    insights.push({
      id: "time-of-day-unavailable",
      statement: "There is not enough recorded start times to describe a time of day.",
      basis: `${untimed} of ${episodes.length} episodes have no recorded time.`,
    });
  }

  return { id: "when", title: "When episodes were recorded", insights };
}

// --- Severity ---------------------------------------------------------------

function severitySection(episodes: Migraine[]): InsightSection {
  const stats = severityStats(episodes);
  const insights: Insight[] = [];

  if (stats.recordedCount === 0) {
    return {
      id: "severity",
      title: "Severity",
      insights,
      note: "No severity has been recorded yet.",
    };
  }

  insights.push({
    id: "average-severity",
    statement: `Your recorded severity averages ${stats.average?.toFixed(1)} out of 10.`,
    basis: `Over ${stats.recordedCount} episode${stats.recordedCount === 1 ? "" : "s"}${
      stats.missingCount > 0
        ? `; ${stats.missingCount} without a recorded severity excluded`
        : ""
    }.`,
  });

  const values = episodes
    .map((episode) => episode.severity)
    .filter((severity): severity is number => severity !== null)
    .sort((a, b) => a - b);
  insights.push({
    id: "median-severity",
    // Severity levels are whole numbers, so an .5 midpoint is rounded to one.
    statement: `Half of them were recorded at ${Math.round(median(values))} or below.`,
    basis: `Median of ${values.length} recorded severities.`,
  });

  const high = values.filter((value) => value >= 7).length;
  insights.push({
    id: "high-severity",
    statement: `${high} of ${values.length} were recorded at 7 or above.`,
    basis: `${Math.round((high / values.length) * 100)}% of episodes with a recorded severity.`,
  });

  // "Most often" is only a fact when one level actually stands out. With every
  // level recorded once - or several tied at the top - there is no mode, and
  // naming whichever happened to sort first would invent a pattern.
  const peakCount = Math.max(...stats.distribution.map((entry) => entry.count));
  const atPeak = stats.distribution.filter((entry) => entry.count === peakCount);
  if (peakCount > 1 && atPeak.length === 1) {
    insights.push({
      id: "most-common-severity",
      statement: `The severity you recorded most often was ${atPeak[0].severity}.`,
      basis: `${peakCount} of ${values.length} episodes.`,
    });
  }

  return { id: "severity", title: "Severity", insights };
}

// --- Duration ---------------------------------------------------------------

function durationSection(episodes: Migraine[]): InsightSection {
  const stats = durationStats(episodes);
  const insights: Insight[] = [];

  if (stats.measuredCount === 0 && stats.estimatedCount === 0) {
    return {
      id: "duration",
      title: "Duration",
      insights,
      note: "No durations have been recorded yet.",
    };
  }

  if (stats.measuredCount > 0) {
    insights.push({
      id: "average-duration",
      statement: `Measured episodes lasted ${formatDuration(stats.averageMeasuredMinutes)} on average.`,
      basis: `Over ${stats.measuredCount} episode${stats.measuredCount === 1 ? "" : "s"} with a measured or entered duration.`,
    });

    const longest = episodes
      .filter((episode) => episode.duration.minutes !== null)
      .sort((a, b) => (b.duration.minutes ?? 0) - (a.duration.minutes ?? 0))[0];
    if (longest) {
      insights.push({
        id: "longest",
        statement: `The longest you recorded was ${formatDuration(longest.duration.minutes)}.`,
        basis: `On ${describeDate(longest.timing.startedAtLocal.slice(0, 10))}.`,
      });
    }
  }

  // Band selections are never folded into the average above; saying how many
  // there are is what keeps that average interpretable.
  if (stats.estimatedCount > 0) {
    insights.push({
      id: "estimated",
      statement: `${stats.estimatedCount} episode${stats.estimatedCount === 1 ? " was" : "s were"} recorded as a range rather than a measured time.`,
      basis: `Including those as their midpoints, the average would be ${formatDuration(stats.averageWithEstimatesMinutes)}.`,
    });
  }

  if (stats.ongoingCount > 0 || stats.unknownCount > 0) {
    const parts: string[] = [];
    if (stats.ongoingCount > 0) parts.push(`${stats.ongoingCount} still marked ongoing`);
    if (stats.unknownCount > 0) parts.push(`${stats.unknownCount} with no duration recorded`);
    insights.push({
      id: "duration-gaps",
      statement: `${joinList(parts)} ${parts.length === 1 ? "is" : "are"} not included in any duration figure.`,
    });
  }

  return { id: "duration", title: "Duration", insights };
}

// --- Sleep ------------------------------------------------------------------

function sleepSection(episodes: Migraine[]): InsightSection {
  const insights: Insight[] = [];
  const withSleep = episodes.filter((episode) => episode.sleep !== null);
  const withHours = withSleep.filter(
    (episode) => episode.sleep?.durationHours != null,
  );

  if (withSleep.length === 0) {
    return {
      id: "sleep",
      title: "Sleep before episodes",
      insights,
      note: "No sleep has been recorded yet.",
    };
  }

  if (withHours.length > 0) {
    const hours = withHours.map((episode) => episode.sleep!.durationHours!);
    const average = hours.reduce((total, value) => total + value, 0) / hours.length;

    insights.push({
      id: "average-sleep",
      statement: `You recorded an average of ${average.toFixed(1)} hours of sleep before these episodes.`,
      basis: `Over ${withHours.length} of ${episodes.length} episodes where sleep was recorded.`,
    });

    const least = Math.min(...hours);
    const most = Math.max(...hours);
    if (least !== most) {
      insights.push({
        id: "sleep-range",
        statement: `The least you recorded was ${formatHours(least)}; the most was ${formatHours(most)}.`,
      });
    }
  }

  // Quality, counted independently of hours - one can be recorded without the
  // other, so they never share a denominator.
  const withQuality = withSleep.filter((episode) => episode.sleep?.quality != null);
  if (withQuality.length > 0) {
    const counts = new Map<string, number>();
    for (const episode of withQuality) {
      const quality = episode.sleep!.quality!;
      counts.set(quality, (counts.get(quality) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    if (top.length === 1 || top[0][1] > top[1][1]) {
      insights.push({
        id: "sleep-quality",
        statement: `You most often described that sleep as ${SLEEP_QUALITY_LABELS[top[0][0] as keyof typeof SLEEP_QUALITY_LABELS].toLowerCase()}.`,
        basis: `${top[0][1]} of ${withQuality.length} episodes with sleep quality recorded.`,
      });
    }
  }

  // The comparison the original brief asked for. Split at the user's own median
  // rather than an arbitrary threshold, and only when both halves are large
  // enough to be worth stating.
  const comparable = withHours.filter((episode) => episode.severity !== null);
  if (comparable.length >= MIN_PATTERN_BASIS * 2) {
    const sortedHours = comparable
      .map((episode) => episode.sleep!.durationHours!)
      .sort((a, b) => a - b);
    const midpoint = median(sortedHours);

    const below = comparable.filter(
      (episode) => episode.sleep!.durationHours! < midpoint,
    );
    const atOrAbove = comparable.filter(
      (episode) => episode.sleep!.durationHours! >= midpoint,
    );

    if (below.length >= MIN_PATTERN_BASIS && atOrAbove.length >= MIN_PATTERN_BASIS) {
      const belowAverage = averageSeverity(below);
      const aboveAverage = averageSeverity(atOrAbove);

      insights.push({
        id: "sleep-severity",
        statement: `Episodes where you recorded less than ${formatHours(midpoint)} of sleep had an average recorded severity of ${belowAverage.toFixed(1)}. Those with ${formatHours(midpoint)} or more averaged ${aboveAverage.toFixed(1)}.`,
        // The one statement here that most invites a causal reading, so it says
        // outright what it is and is not.
        basis: `${below.length} episodes below and ${atOrAbove.length} at or above your midpoint of ${formatHours(midpoint)}. This compares what you recorded; it does not show that one affected the other.`,
      });
    }
  }

  const missing = episodes.length - withSleep.length;
  if (missing > 0 && insights.length > 0) {
    insights.push({
      id: "sleep-missing",
      statement: `${missing} of ${episodes.length} episodes have no sleep recorded and are left out of these figures.`,
    });
  }

  return { id: "sleep", title: "Sleep before episodes", insights };
}

function averageSeverity(episodes: Migraine[]): number {
  const values = episodes.map((episode) => episode.severity!);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
}

// --- Recorded alongside episodes --------------------------------------------

function recordedAlongsideSection(episodes: Migraine[]): InsightSection {
  const insights: Insight[] = [];

  if (episodes.length === 0) {
    return {
      id: "alongside",
      title: "Recorded alongside episodes",
      insights,
      note: "Nothing has been logged yet.",
    };
  }

  const triggers = frequency(episodes, (episode) => episode.possibleTriggers, 3);
  const symptoms = frequency(episodes, (episode) => episode.symptoms, 3);
  const locations = frequency(episodes, (episode) => episode.painLocations, 1);

  for (const entry of triggers) {
    insights.push({
      id: `trigger-${entry.value}`,
      // "Recorded alongside" is doing real work: it states co-occurrence and
      // nothing more.
      statement: `${entry.label} was recorded alongside ${entry.count} of ${episodes.length} episodes.`,
      basis: `${Math.round(entry.share * 100)}% of episodes.`,
    });
  }

  for (const entry of symptoms) {
    insights.push({
      id: `symptom-${entry.value}`,
      statement: `${entry.label} was recorded as a symptom in ${entry.count} of ${episodes.length} episodes.`,
      basis: `${Math.round(entry.share * 100)}% of episodes.`,
    });
  }

  if (locations[0]) {
    insights.push({
      id: `location-${locations[0].value}`,
      statement: `The pain location you recorded most often was ${locations[0].label.toLowerCase()}.`,
      basis: `${locations[0].count} of ${episodes.length} episodes.`,
    });
  }

  if (insights.length === 0) {
    return {
      id: "alongside",
      title: "Recorded alongside episodes",
      insights,
      note: "No symptoms, triggers, or pain locations have been recorded yet.",
    };
  }

  return { id: "alongside", title: "Recorded alongside episodes", insights };
}

// --- What you recorded as helping -------------------------------------------

function respondedSection(episodes: Migraine[]): InsightSection {
  const insights: Insight[] = [];

  const medications = tallyHelped(
    episodes.flatMap((episode) =>
      episode.medications.map((medication) => ({
        key: medication.name,
        helped: medication.helped,
      })),
    ),
  );

  const reliefs = tallyHelped(
    episodes.flatMap((episode) =>
      episode.reliefMethods.map((relief) => ({
        key: relief.method,
        helped: relief.helped,
      })),
    ),
  );

  for (const entry of medications.slice(0, 3)) {
    insights.push({
      id: `medication-${entry.key}`,
      // Reports what was written down. It is not a claim that the medication
      // worked, and carries no recommendation either way.
      statement: `You recorded taking ${entry.key} during ${entry.total} episode${entry.total === 1 ? "" : "s"}.`,
      basis: describeHelped(entry),
    });
  }

  for (const entry of reliefs.slice(0, 3)) {
    insights.push({
      id: `relief-${entry.key}`,
      statement: `You recorded trying ${labelFor(entry.key).toLowerCase()} during ${entry.total} episode${entry.total === 1 ? "" : "s"}.`,
      basis: describeHelped(entry),
    });
  }

  if (insights.length === 0) {
    return {
      id: "responded",
      title: "What you recorded taking and trying",
      insights,
      note: "No medications or relief methods have been recorded yet.",
    };
  }

  return { id: "responded", title: "What you recorded taking and trying", insights };
}

type HelpedTally = {
  key: string;
  total: number;
  yes: number;
  no: number;
  unsure: number;
  unrecorded: number;
};

function tallyHelped(
  entries: { key: string; helped: string | null }[],
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

function describeHelped(tally: HelpedTally): string {
  const parts: string[] = [];
  if (tally.yes > 0) parts.push(`${tally.yes} noted as "${HELPED_LABELS.yes.toLowerCase()}"`);
  if (tally.no > 0) parts.push(`${tally.no} as "${HELPED_LABELS.no.toLowerCase()}"`);
  if (tally.unsure > 0) parts.push(`${tally.unsure} as "${HELPED_LABELS.unsure.toLowerCase()}"`);
  if (tally.unrecorded > 0) parts.push(`${tally.unrecorded} not noted either way`);
  return parts.length > 0 ? `${joinList(parts)}.` : "";
}

// --- Helpers ----------------------------------------------------------------

/**
 * Rounded to a whole unit, which suits severity levels. Sleep uses the raw
 * midpoint instead, so a half-hour median is not silently rounded away.
 */
function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** Inclusive count of calendar months between two `"YYYY-MM-DD"` dates. */
function monthSpan(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return Math.max(1, (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1);
}

function describeDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function describeMonth(date: string): string {
  const [year, month] = date.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
