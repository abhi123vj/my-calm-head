/**
 * Time handling for migraine episodes.
 *
 * An episode is recorded three ways, all written together so they cannot drift:
 *
 *  - `startedAt`  — the true UTC instant. Used for durations and for anything
 *                   that must be ordered across a timezone change.
 *  - `startedAtLocal` — the wall clock exactly as entered, `"YYYY-MM-DDTHH:mm"`.
 *                   Sorts and range-scans lexicographically, so calendar
 *                   months, date filters, hour-of-day and day-of-week all read
 *                   straight off this field with no timezone arithmetic.
 *  - `timezoneOffsetMinutes` — the offset in effect when it was recorded, using
 *                   the `Date.prototype.getTimezoneOffset` convention (minutes
 *                   to ADD to local time to reach UTC; IST is -330).
 *
 * Storing the wall clock is what makes "I had a migraine at 2am" land on the
 * right calendar date. Deriving it from the instant instead would move any
 * late-night episode to the wrong day for every timezone east or west of UTC.
 */

/** `"YYYY-MM-DDTHH:mm"` — minute precision, no seconds, no zone suffix. */
export const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** `"YYYY-MM-DD"`. */
export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type LocalParts = {
  /** `"YYYY-MM-DD"` */
  date: string;
  /** `"HH:mm"` */
  time: string;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
};

export function isValidLocalDateTime(value: string): boolean {
  if (!LOCAL_DATE_TIME_PATTERN.test(value)) return false;
  // Rejects things the pattern allows but the calendar does not, e.g. 2026-02-30.
  const asUtc = new Date(`${value}:00.000Z`);
  return (
    !Number.isNaN(asUtc.getTime()) &&
    asUtc.toISOString().slice(0, 16) === value
  );
}

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const asUtc = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(asUtc.getTime()) &&
    asUtc.toISOString().slice(0, 10) === value
  );
}

/** Wall clock + offset -> the UTC instant it refers to. */
export function localToInstant(local: string, offsetMinutes: number): Date {
  const asIfUtc = new Date(`${local}:00.000Z`).getTime();
  return new Date(asIfUtc + offsetMinutes * 60_000);
}

/** UTC instant + offset -> the wall clock it shows on that clock. */
export function instantToLocal(instant: Date, offsetMinutes: number): string {
  return new Date(instant.getTime() - offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function localParts(local: string): LocalParts {
  const date = local.slice(0, 10);
  const time = local.slice(11, 16);
  return {
    date,
    time,
    hour: Number(time.slice(0, 2)),
    minute: Number(time.slice(3, 5)),
    weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
  };
}

/** The offset currently in effect in this runtime, for pre-filling new entries. */
export function currentOffsetMinutes(): number {
  return new Date().getTimezoneOffset();
}

/** Whole minutes between two instants. Negative if `end` precedes `start`. */
export function durationMinutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/**
 * "5 hours 32 minutes", "45 minutes", "2 days 3 hours".
 * Returns `null` for negative input so a bad record reads as unknown rather
 * than as a nonsense duration.
 */
export function formatDuration(totalMinutes: number | null): string | null {
  if (totalMinutes === null || totalMinutes < 0) return null;
  if (totalMinutes === 0) return "Less than a minute";

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(plural(days, "day"));
  if (hours > 0) parts.push(plural(hours, "hour"));
  // Trailing minutes are noise once the episode is measured in days.
  if (minutes > 0 && days === 0) parts.push(plural(minutes, "minute"));

  return parts.join(" ");
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
