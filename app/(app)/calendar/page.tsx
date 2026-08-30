import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

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
    <div className="space-y-5">
      {/* Prev and next are icon buttons flanking the title rather than named
          links in a row. At 320px "← December  Today  January →" wrapped onto
          two lines and pushed the grid down the screen. */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href={calendarHref(previous)}
            aria-label={`Go to ${monthLabel(previous)}`}
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronLeft aria-hidden />
          </Link>

          <h1 className="text-title min-w-0 flex-1 truncate text-center">
            {monthLabel(month)}
          </h1>

          <Link
            href={calendarHref(next)}
            aria-label={`Go to ${monthLabel(next)}`}
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronRight aria-hidden />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1">
          <span className="text-body-sm text-muted-foreground">
            {episodes.length === 0
              ? "No episodes in this view"
              : `${episodes.length} episode${episodes.length === 1 ? "" : "s"} shown`}
          </span>
          <Link
            href="/calendar"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Today
          </Link>
        </div>
      </header>

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
        <p className="border-border bg-card text-body-sm text-muted-foreground flex items-center gap-2.5 rounded-xl border border-dashed px-4 py-3.5">
          <CalendarDays aria-hidden className="text-lavender-deep size-5 shrink-0" />
          Select a highlighted date to see the episodes recorded on it.
        </p>
      )}

      <p className="text-caption text-muted-foreground">
        Episodes appear on the date they started. One that ran past midnight is
        still shown once, on its start date.
      </p>
    </div>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
