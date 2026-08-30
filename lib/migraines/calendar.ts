import { localParts } from "@/lib/time";
import type { Migraine } from "@/types/migraine";

/**
 * Month-grid maths for the calendar.
 *
 * Every date is a `"YYYY-MM-DD"` string and every calculation runs in UTC. The
 * dates here are calendar squares, not instants, so using local `Date` methods
 * would let the host machine's timezone shift a square onto the wrong day.
 */

/** 1 = Monday (ISO). Change this one value to start weeks on Sunday. */
const WEEK_STARTS_ON = 1;

export const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
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

export type CalendarMonth = { year: number; month: number };

export type CalendarDay = {
  /** `"YYYY-MM-DD"` */
  date: string;
  dayOfMonth: number;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
};

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

/** Falls back to the current month for anything unusable. */
export function parseMonthParam(
  value: string | undefined,
  today: Date = new Date(),
): CalendarMonth {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12 && year >= 1970 && year <= 9999) {
      return { year, month };
    }
  }
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export function monthKey({ year, month }: CalendarMonth): string {
  return `${year}-${pad(month)}`;
}

export function monthLabel({ year, month }: CalendarMonth): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function shiftMonth(
  { year, month }: CalendarMonth,
  delta: number,
): CalendarMonth {
  const zeroBased = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

/** Today as a local `"YYYY-MM-DD"`, for highlighting the current square. */
export function todayLocalDate(today: Date = new Date()): string {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

/**
 * Full weeks covering the month, including the days borrowed from the months
 * either side so the grid is rectangular.
 */
export function monthGrid(
  month: CalendarMonth,
  today: Date = new Date(),
): CalendarDay[][] {
  const firstOfMonth = Date.UTC(month.year, month.month - 1, 1);
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();

  const leading =
    (new Date(firstOfMonth).getUTCDay() - WEEK_STARTS_ON + 7) % 7;
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;
  const todayDate = todayLocalDate(today);

  const weeks: CalendarDay[][] = [];
  for (let cell = 0; cell < cellCount; cell += 1) {
    const stamp = new Date(firstOfMonth);
    stamp.setUTCDate(stamp.getUTCDate() + cell - leading);

    const date = stamp.toISOString().slice(0, 10);
    const day: CalendarDay = {
      date,
      dayOfMonth: stamp.getUTCDate(),
      inMonth: stamp.getUTCMonth() === month.month - 1,
      isToday: date === todayDate,
    };

    if (cell % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }

  return weeks;
}

/** The date range the whole grid covers, for a single query per month view. */
export function gridRange(weeks: CalendarDay[][]): { from: string; to: string } {
  const first = weeks[0][0];
  const lastWeek = weeks[weeks.length - 1];
  return { from: first.date, to: lastWeek[lastWeek.length - 1].date };
}

/**
 * Episodes keyed by the local date they started on.
 *
 * An episode is placed on its start date only. One that runs past midnight is
 * still a single episode that began on a particular day, and counting it twice
 * would inflate every frequency figure built on this grouping.
 */
export function groupByLocalDate(
  episodes: Migraine[],
): Map<string, Migraine[]> {
  const grouped = new Map<string, Migraine[]>();

  for (const episode of episodes) {
    const { date } = localParts(episode.timing.startedAtLocal);
    const existing = grouped.get(date);
    if (existing) existing.push(episode);
    else grouped.set(date, [episode]);
  }

  return grouped;
}

/** What a single square needs to render. */
export type DaySummary = {
  count: number;
  /** Highest recorded severity that day, or `null` if none was recorded. */
  peakSeverity: number | null;
  hasOngoing: boolean;
  hasDraft: boolean;
};

export function summarizeDay(episodes: Migraine[]): DaySummary {
  const severities = episodes
    .map((episode) => episode.severity)
    .filter((severity): severity is number => severity !== null);

  return {
    count: episodes.length,
    peakSeverity: severities.length > 0 ? Math.max(...severities) : null,
    hasOngoing: episodes.some((episode) => episode.duration.kind === "ongoing"),
    hasDraft: episodes.some((episode) => episode.status === "draft"),
  };
}

export function calendarHref(month: CalendarMonth, date?: string): string {
  const params = new URLSearchParams({ month: monthKey(month) });
  if (date) params.set("date", date);
  return `/calendar?${params.toString()}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
