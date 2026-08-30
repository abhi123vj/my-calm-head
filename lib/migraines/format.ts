import { SEVERITY_LABELS, labelFor } from "@/lib/migraines/catalog";
import { localParts } from "@/lib/time";
import type { Migraine, MigraineTiming } from "@/types/migraine";

/**
 * Display helpers for stored episodes.
 *
 * Formatting is done by hand rather than with `Intl`, so a value renders
 * identically on the server and in the browser regardless of either one's
 * locale. Anything locale-dependent here would show up as a hydration mismatch.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** `"2026-08-30T14:30"` -> `"August 30, 2026"`. */
export function formatLocalDate(local: string): string {
  const { date } = localParts(local);
  const [year, month, day] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/** `"2026-08-30T14:30"` -> `"Sun, 30 Aug 2026"`. */
export function formatShortDate(local: string): string {
  const { date, weekday } = localParts(local);
  const [year, month, day] = date.split("-");
  return `${WEEKDAYS[weekday]}, ${Number(day)} ${MONTHS[Number(month) - 1].slice(0, 3)} ${year}`;
}

/** `"2026-08-30T14:30"` -> `"Aug"`. */
export function formatMonthAbbr(local: string): string {
  const { date } = localParts(local);
  return MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3);
}

/** `"2026-08-30T14:30"` -> `"2:30 pm"`. */
export function formatLocalTime(local: string): string {
  const { hour, minute } = localParts(local);
  const suffix = hour < 12 ? "am" : "pm";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/**
 * The start, worded to match how confidently it was recorded. An unknown time
 * is never printed as a clock reading - the stored value is only a placeholder.
 */
export function describeStart(timing: MigraineTiming): string {
  const date = formatLocalDate(timing.startedAtLocal);
  if (timing.startPrecision === "unknown") return `${date}, time not recorded`;

  const time = formatLocalTime(timing.startedAtLocal);
  return timing.startPrecision === "approximate"
    ? `${date}, around ${time}`
    : `${date} at ${time}`;
}

/** `null` when no end was recorded. */
export function describeEnd(timing: MigraineTiming): string | null {
  if (!timing.endedAtLocal) return null;

  const date = formatLocalDate(timing.endedAtLocal);
  if (timing.endPrecision === "unknown") return `${date}, time not recorded`;

  const time = formatLocalTime(timing.endedAtLocal);
  return timing.endPrecision === "approximate"
    ? `${date}, around ${time}`
    : `${date} at ${time}`;
}

/** The time alone, or `null` when it was not recorded. */
export function startTimeOrNull(timing: MigraineTiming): string | null {
  return timing.startPrecision === "unknown"
    ? null
    : formatLocalTime(timing.startedAtLocal);
}

export function formatSeverity(severity: number | null): string {
  if (severity === null) return "Not recorded";
  return `${severity} / 10 · ${SEVERITY_LABELS[severity]}`;
}

/**
 * A one-line description of an episode, for list rows and the calendar.
 * Falls back through what was actually recorded rather than showing blanks.
 */
export function summarizeEpisode(migraine: Migraine): string {
  const parts: string[] = [];
  if (migraine.headacheType) parts.push(labelFor(migraine.headacheType));
  if (migraine.severity !== null) parts.push(`${migraine.severity}/10`);
  if (migraine.duration.kind !== "unknown") parts.push(migraine.duration.label);
  return parts.length > 0 ? parts.join(" · ") : "No details recorded";
}

export function formatLabels(values: string[]): string[] {
  return values.map(labelFor);
}
