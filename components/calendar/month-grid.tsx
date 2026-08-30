import Link from "next/link";

import {
  WEEKDAY_HEADERS,
  calendarHref,
  summarizeDay,
  type CalendarDay,
  type CalendarMonth,
} from "@/lib/migraines/calendar";
import {
  NO_SEVERITY_BAND,
  SEVERITY_BANDS,
  severityBand,
} from "@/lib/migraines/severity-scale";
import { cn } from "@/lib/utils";
import type { Migraine } from "@/types/migraine";

/**
 * The month grid.
 *
 * A square is tinted by the day's highest recorded severity and also prints
 * that number, so the colour is a scanning aid rather than the only way to read
 * the value. Only days that actually have episodes are links - there is nothing
 * to show for an empty one.
 *
 * At 320px a square is about 38px across, which is why the contents are placed
 * rather than stacked: the date sits in the corner, the severity takes the
 * middle at a readable size, and a second episode is a small count in the
 * opposite corner. The previous version stacked three lines of text, including
 * the words "2 episodes", into that space.
 */
export function MonthGrid({
  month,
  weeks,
  episodesByDate,
  selectedDate,
}: {
  month: CalendarMonth;
  weeks: CalendarDay[][];
  episodesByDate: Map<string, Migraine[]>;
  selectedDate: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="border-border bg-card rounded-xl border p-2 shadow-card sm:p-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_HEADERS.map((weekday) => (
            <div
              key={weekday}
              className="text-muted-foreground pb-1 text-center text-[10px] font-semibold tracking-wide uppercase sm:text-caption"
            >
              {/* One letter is enough at 320px; the full abbreviation returns
                  as soon as there is room for it. */}
              <span aria-hidden className="sm:hidden">
                {weekday.charAt(0)}
              </span>
              <span className="sr-only sm:not-sr-only">{weekday}</span>
            </div>
          ))}

          {weeks.flat().map((day) => (
            <DaySquare
              key={day.date}
              day={day}
              month={month}
              episodes={episodesByDate.get(day.date) ?? []}
              selected={day.date === selectedDate}
            />
          ))}
        </div>
      </div>

      <Legend />
    </div>
  );
}

function DaySquare({
  day,
  month,
  episodes,
  selected,
}: {
  day: CalendarDay;
  month: CalendarMonth;
  episodes: Migraine[];
  selected: boolean;
}) {
  const summary = summarizeDay(episodes);
  const hasEpisodes = summary.count > 0;
  const band = hasEpisodes ? severityBand(summary.peakSeverity) : null;

  const content = (
    <>
      {/* Only the repeat count is positioned. The date and the severity are
          stacked in flow: at 320px a square is ~38px, and a corner-anchored
          date collided with a centred severity number inside it. */}
      {summary.count > 1 ? (
        <span
          aria-hidden
          className="absolute top-0.5 right-1 text-[9px] leading-none font-semibold tabular-nums opacity-85 sm:top-1 sm:right-1.5 sm:text-[10px]"
        >
          ×{summary.count}
        </span>
      ) : null}

      <span
        className={cn(
          "text-[10px] leading-none tabular-nums sm:text-caption",
          day.isToday && "ring-current rounded-full px-1 py-0.5 ring-1",
        )}
      >
        {day.dayOfMonth}
      </span>

      {hasEpisodes ? (
        <span className="text-body leading-none font-semibold tabular-nums sm:text-heading">
          {summary.peakSeverity ?? "–"}
        </span>
      ) : null}
    </>
  );

  const classes =
    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all";

  if (!hasEpisodes) {
    return (
      <div
        className={cn(
          classes,
          "border-border/70 text-muted-foreground",
          !day.inMonth && "opacity-45",
        )}
        aria-hidden={!day.inMonth}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={calendarHref(month, day.date)}
      title={describeDay(day.date, summary)}
      aria-label={describeDay(day.date, summary)}
      aria-current={selected ? "date" : undefined}
      className={cn(
        classes,
        "border-transparent hover:brightness-105 hover:shadow-raised",
        !day.inMonth && "opacity-55",
        // The selected ring is drawn with a box-shadow so it does not change
        // the square's size and shift the whole grid.
        selected && "shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--primary)]",
      )}
      style={{ backgroundColor: band?.background, color: band?.foreground }}
    >
      {content}
    </Link>
  );
}

function describeDay(
  date: string,
  summary: ReturnType<typeof summarizeDay>,
): string {
  const parts = [
    `${date}: ${summary.count} episode${summary.count === 1 ? "" : "s"}`,
    summary.peakSeverity === null
      ? "severity not recorded"
      : `highest severity ${summary.peakSeverity} of 10`,
  ];
  if (summary.hasOngoing) parts.push("one still ongoing");
  if (summary.hasDraft) parts.push("includes a draft");
  return parts.join(", ");
}

/**
 * Required because the tint carries meaning. The numbers in each square repeat
 * it, but the legend is what makes the bands themselves legible.
 */
function Legend() {
  return (
    <div className="text-caption flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-muted-foreground">Highest severity that day</span>
      {SEVERITY_BANDS.map((band) => (
        <span key={band.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-[4px]"
            style={{ backgroundColor: band.background }}
          />
          {band.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="border-border size-3 rounded-[4px] border"
          style={{ backgroundColor: NO_SEVERITY_BAND.background }}
        />
        {NO_SEVERITY_BAND.label}
      </span>
    </div>
  );
}
