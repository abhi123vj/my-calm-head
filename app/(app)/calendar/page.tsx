import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { listMigraines } from "@/lib/migraines/repository";
import {
  calendarHref,
  gridRange,
  groupByLocalDate,
  monthGrid,
  monthLabel,
  parseMonthParam,
  shiftMonth,
} from "@/lib/migraines/calendar";
import { isValidLocalDate } from "@/lib/time";
import { MonthGrid } from "@/components/calendar/month-grid";
import { DayPanel } from "@/components/calendar/day-panel";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Calendar",
};

export default async function CalendarPage(props: PageProps<"/calendar">) {
  await requireSession();

  const searchParams = await props.searchParams;
  const month = parseMonthParam(first(searchParams.month));
  const weeks = monthGrid(month);

  // One range scan covers the whole grid, including the days borrowed from the
  // neighbouring months, so a square is never blank just because it sits at an
  // edge. Oldest-first keeps same-day episodes in chronological order.
  const range = gridRange(weeks);
  const episodes = await listMigraines({
    from: range.from,
    to: range.to,
    sort: "oldest",
  });
  const episodesByDate = groupByLocalDate(episodes);

  const requestedDate = first(searchParams.date);
  const selectedDate =
    requestedDate && isValidLocalDate(requestedDate) ? requestedDate : null;

  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{monthLabel(month)}</h1>
          <p className="text-muted-foreground text-sm">
            {episodes.length === 0
              ? "No episodes in this view."
              : `${episodes.length} episode${episodes.length === 1 ? "" : "s"} shown`}
          </p>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href={calendarHref(previous)}
            aria-label={`Go to ${monthLabel(previous)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            &larr; {monthLabel(previous).split(" ")[0]}
          </Link>
          <Link
            href="/calendar"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Today
          </Link>
          <Link
            href={calendarHref(next)}
            aria-label={`Go to ${monthLabel(next)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {monthLabel(next).split(" ")[0]} &rarr;
          </Link>
        </nav>
      </div>

      <MonthGrid
        month={month}
        weeks={weeks}
        episodesByDate={episodesByDate}
        selectedDate={selectedDate}
      />

      {selectedDate ? (
        <DayPanel
          date={selectedDate}
          episodes={episodesByDate.get(selectedDate) ?? []}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Select a highlighted date to see the episodes recorded on it.
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        Episodes appear on the date they started. One that ran past midnight is
        still shown once, on its start date.
      </p>
    </div>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
