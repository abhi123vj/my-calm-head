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
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((weekday) => (
          <div
            key={weekday}
            className="text-muted-foreground pb-1 text-center text-xs font-medium"
          >
            {weekday}
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
      <span
        className={cn(
          "text-xs",
          day.isToday && "ring-foreground/60 rounded-full px-1 ring-1",
        )}
      >
        {day.dayOfMonth}
      </span>

      {hasEpisodes ? (
        <span className="text-sm font-semibold tabular-nums">
          {summary.peakSeverity ?? "–"}
        </span>
      ) : null}

      {summary.count > 1 ? (
        <span className="text-[10px] leading-none opacity-80">
          {summary.count} episodes
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-center transition-shadow",
    day.inMonth ? "" : "opacity-40",
    hasEpisodes ? "border-transparent" : "border-border",
    selected && "ring-foreground ring-2 ring-offset-1",
  );

  if (!hasEpisodes) {
    return (
      <div className={cn(classes, "text-muted-foreground")} aria-hidden={!day.inMonth}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={calendarHref(month, day.date)}
      title={describeDay(day.date, summary)}
      aria-label={describeDay(day.date, summary)}
      className={cn(classes, "hover:shadow-md focus-visible:ring-2")}
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="text-muted-foreground">Highest severity that day</span>
      {SEVERITY_BANDS.map((band) => (
        <span key={band.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-sm"
            style={{ backgroundColor: band.background }}
          />
          {band.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-3 rounded-sm"
          style={{ backgroundColor: NO_SEVERITY_BAND.background }}
        />
        {NO_SEVERITY_BAND.label}
      </span>
    </div>
  );
}
