import { ChevronDown } from "lucide-react";

import { severityBand } from "@/lib/migraines/severity-scale";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Charts built from plain elements rather than a charting library.
 *
 * Bars are drawn with CSS and the one line chart with inline SVG, which between
 * them cover everything this dashboard needs exactly and accessibly, with no
 * dependency, no client JavaScript, and no hydration. Each chart carries a
 * `title` for hover detail and a collapsed table underneath, so the numbers are
 * always reachable without relying on colour or on pointer hover.
 */

/** The theme's indigo, 4.9:1 against the page background. */
const BAR_COLOR = "var(--chart-1)";

export function ChartCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  /** For the chart that wants the full width of the grid. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export type ColumnDatum = {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  /**
   * What the table shows instead of `value`. Needed where 0 is standing in for
   * "not recorded" - printing a real zero there would assert something the data
   * does not say.
   */
  displayValue?: string;
  /** Overrides the default bar colour, e.g. to tint by severity band. */
  color?: string;
  title: string;
};

/**
 * Vertical bars over a time axis.
 *
 * At most one bar is labelled directly - a number above every column turns the
 * chart back into a table. When several bars tie for the maximum, none are
 * labelled, because labelling all of them is the thing being avoided. The table
 * below carries every value either way.
 *
 * `maxValue` fixes the top of the scale. Counts have no natural ceiling and are
 * scaled to their own peak, but a bounded measure must not be: an average
 * severity of 4 drawn full-height because 4 was the highest month reads as a
 * severe month. Passing the scale's own maximum keeps the bar heights meaning
 * what the reader assumes they mean.
 */
export function ColumnChart({
  data,
  valueSuffix = "",
  emptyMessage = "Nothing recorded yet.",
  tableHeading,
  maxValue,
}: {
  data: ColumnDatum[];
  valueSuffix?: string;
  emptyMessage?: string;
  tableHeading: string;
  maxValue?: number;
}) {
  const peak = Math.max(...data.map((datum) => datum.value), 0);

  if (peak === 0) {
    return <ChartEmpty>{emptyMessage}</ChartEmpty>;
  }

  // Never below the data: a fixed ceiling scales the chart, it cannot clip it.
  const max = maxValue === undefined ? peak : Math.max(maxValue, peak);

  // Only a single, unambiguous peak earns a direct label.
  const peakKey =
    data.filter((datum) => datum.value === peak).length === 1
      ? data.find((datum) => datum.value === peak)?.key
      : undefined;

  return (
    <div className="space-y-3">
      {/* The baseline is drawn as a border on the plot area so bars sit on a
          line rather than floating, which matters once several months are 0. */}
      <div className="border-border flex h-36 items-end gap-1 border-b sm:h-40">
        {data.map((datum) => {
          const isPeak = datum.key === peakKey;
          return (
            <div
              key={datum.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={datum.title}
            >
              {isPeak ? (
                <span className="text-primary-strong text-[10px] leading-none font-semibold tabular-nums">
                  {formatValue(datum.value)}
                  {valueSuffix}
                </span>
              ) : null}
              <div
                className="w-full rounded-t-[3px] transition-opacity hover:opacity-85"
                style={{
                  height: `${(datum.value / max) * 100}%`,
                  minHeight: datum.value > 0 ? 3 : 0,
                  backgroundColor: datum.color ?? BAR_COLOR,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="text-muted-foreground flex gap-1 text-[10px]">
        {data.map((datum) => (
          <div key={datum.key} className="min-w-0 flex-1 text-center">
            <div className="truncate">{datum.label}</div>
            {datum.sublabel ? (
              <div className="truncate opacity-70">{datum.sublabel}</div>
            ) : null}
          </div>
        ))}
      </div>

      <DataTable
        heading={tableHeading}
        rows={data.map((datum) => ({
          key: datum.key,
          label: `${datum.label}${datum.sublabel ? ` ${datum.sublabel}` : ""}`,
          value:
            datum.displayValue ?? `${formatValue(datum.value)}${valueSuffix}`,
        }))}
      />
    </div>
  );
}

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  detail: string;
};

/**
 * Horizontal frequency bars. Each row is labelled with its own count, which is
 * the readable form for a ranked list rather than a number on a time series.
 */
export function FrequencyBars({
  data,
  emptyMessage,
  tableHeading,
}: {
  data: BarDatum[];
  emptyMessage: string;
  tableHeading: string;
}) {
  const max = Math.max(...data.map((datum) => datum.value), 0);

  if (data.length === 0 || max === 0) {
    return <ChartEmpty>{emptyMessage}</ChartEmpty>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {data.map((datum) => (
          <li key={datum.key} className="space-y-1.5" title={datum.detail}>
            <div className="text-body-sm flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{datum.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {datum.value}
              </span>
            </div>
            <div className="bg-lavender h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(datum.value / max) * 100}%`,
                  backgroundColor: BAR_COLOR,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <DataTable
        heading={tableHeading}
        rows={data.map((datum) => ({
          key: datum.key,
          label: datum.label,
          value: datum.detail,
        }))}
      />
    </div>
  );
}

/** Severity 1-10, tinted with the same bands the calendar uses. */
export function SeverityDistribution({
  distribution,
  total,
}: {
  distribution: { severity: number; count: number }[];
  total: number;
}) {
  if (total === 0) {
    return <ChartEmpty>No severity has been recorded yet.</ChartEmpty>;
  }

  return (
    <ColumnChart
      tableHeading="Severity distribution"
      valueSuffix=""
      data={distribution.map((entry) => ({
        key: String(entry.severity),
        label: String(entry.severity),
        value: entry.count,
        color: severityBand(entry.severity).background,
        title: `Severity ${entry.severity}: ${entry.count} episode${
          entry.count === 1 ? "" : "s"
        }`,
      }))}
    />
  );
}

export type StackedSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type StackedDatum = {
  key: string;
  label: string;
  /** The sum of the segments, and the row's own bar length. */
  total: number;
  segments: StackedSegment[];
  /** The row spelled out for the table underneath. */
  detail: string;
};

/**
 * Horizontal bars split into parts.
 *
 * Row length is scaled to the largest total rather than to 100%, so a bar says
 * two things at once: how often something was recorded, and how the notes on it
 * were divided. Segments are therefore comparable across rows as well as within
 * one - a row half the length of another really was recorded half as often.
 *
 * Zero-value segments are dropped rather than drawn as slivers.
 */
export function StackedBars({
  data,
  legend,
  emptyMessage,
  tableHeading,
}: {
  data: StackedDatum[];
  legend: readonly { key: string; label: string; color: string }[];
  emptyMessage: string;
  tableHeading: string;
}) {
  const max = Math.max(...data.map((datum) => datum.total), 0);

  if (data.length === 0 || max === 0) {
    return <ChartEmpty>{emptyMessage}</ChartEmpty>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {data.map((datum) => (
          <li key={datum.key} className="space-y-1.5" title={datum.detail}>
            <div className="text-body-sm flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{datum.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {datum.total}
              </span>
            </div>
            <div className="bg-lavender h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full"
                style={{ width: `${(datum.total / max) * 100}%` }}
              >
                {datum.segments
                  .filter((segment) => segment.value > 0)
                  .map((segment) => (
                    <div
                      key={segment.key}
                      title={`${datum.label}: ${segment.value} ${segment.label.toLowerCase()}`}
                      style={{
                        width: `${(segment.value / datum.total) * 100}%`,
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ChartLegend items={legend} />

      <DataTable
        heading={tableHeading}
        rows={data.map((datum) => ({
          key: datum.key,
          label: datum.label,
          value: datum.detail,
        }))}
      />
    </div>
  );
}

/** Names the colours, so a segment never has to be identified by hue alone. */
function ChartLegend({
  items,
}: {
  items: readonly { key: string; label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.key}
          className="text-caption text-muted-foreground flex items-center gap-1.5"
        >
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export type LinePoint = {
  key: string;
  /** Names the point in the table underneath. */
  label: string;
  value: number;
  /** Hover detail, as on every other chart here. */
  title: string;
  /** Printed on the axis when set; most points leave it out. */
  tick?: string;
  /** What the table prints instead of `value`. */
  displayValue?: string;
};

/**
 * A single line over a continuous measure.
 *
 * Reserved for quantities that really are continuous. Counts per month are
 * separate buckets and belong in columns; a rolling figure moves a little every
 * day, and joining its samples with a line says something true about the days
 * between them.
 *
 * The plot is one `viewBox` stretched to the container with
 * `preserveAspectRatio="none"`, so the line fills the card at any width. That
 * would distort anything drawn on it, which is why the marks are limited to
 * strokes kept at a constant width by `vector-effect` and to rectangles - and
 * why the hover targets are invisible bands rather than dots on the line.
 */
export function LineChart({
  data,
  maxValue,
  valueSuffix = "",
  emptyMessage,
  tableHeading,
  summary,
}: {
  data: LinePoint[];
  maxValue?: number;
  valueSuffix?: string;
  emptyMessage: string;
  tableHeading: string;
  /** Describes the whole chart for anyone who cannot see it. */
  summary: string;
}) {
  // A single sample is a dot, not a trend; the table still holds the figure.
  if (data.length < 2) {
    return <ChartEmpty>{emptyMessage}</ChartEmpty>;
  }

  const peak = Math.max(...data.map((datum) => datum.value), 0);
  // Never zero: a flat run of nothing recorded must still draw on the baseline
  // rather than divide by zero.
  const max = Math.max(maxValue ?? 0, peak, 1);
  const step = 100 / (data.length - 1);

  const coordinates = data.map((datum, index) => ({
    x: index * step,
    y: 100 - (datum.value / max) * 100,
  }));

  const line = coordinates
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
  const area = `${line} L100 100 L0 100 Z`;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* The scale, in HTML rather than in the SVG: text inside a stretched
            viewBox would be stretched with it. */}
        <div className="text-muted-foreground flex h-36 shrink-0 flex-col justify-between text-[10px] tabular-nums sm:h-40">
          <span>
            {formatValue(max)}
            {valueSuffix}
          </span>
          <span>0</span>
        </div>

        {/* The plot and the axis share one column, so a tick sits exactly under
            the sample it names. */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="border-border h-36 border-b sm:h-40">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={summary}
            >
              <line
                x1="0"
                x2="100"
                y1="50"
                y2="50"
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <path d={area} fill={BAR_COLOR} fillOpacity="0.12" />
              <path
                d={line}
                fill="none"
                stroke={BAR_COLOR}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* One band per sample, so hover detail works the way it does on the
                bars without putting a distorted dot on the line. */}
              {data.map((datum, index) => (
                <rect
                  key={datum.key}
                  x={Math.max(0, coordinates[index].x - step / 2)}
                  y="0"
                  width={
                    index === 0 || index === data.length - 1 ? step / 2 : step
                  }
                  height="100"
                  fill="transparent"
                >
                  <title>{datum.title}</title>
                </rect>
              ))}
            </svg>
          </div>

          <div className="text-muted-foreground relative h-3.5 text-[10px]">
            {data.map((datum, index) =>
              datum.tick ? (
                <span
                  key={datum.key}
                  // The end ticks are pulled inside the plot rather than
                  // centred, so neither one hangs off the edge of the card.
                  className={cn(
                    "absolute whitespace-nowrap",
                    index === 0
                      ? "translate-x-0"
                      : index === data.length - 1
                        ? "-translate-x-full"
                        : "-translate-x-1/2",
                  )}
                  style={{ left: `${coordinates[index].x}%` }}
                >
                  {datum.tick}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <DataTable
        heading={tableHeading}
        rows={data.map((datum) => ({
          key: datum.key,
          label: datum.label,
          value:
            datum.displayValue ?? `${formatValue(datum.value)}${valueSuffix}`,
        }))}
      />
    </div>
  );
}

/** A chart with nothing to draw should still look composed, not blank. */
function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface-sunken/60 text-body-sm text-muted-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center text-balance">
      {children}
    </div>
  );
}

/** Always available, so no figure depends on hovering or on seeing colour. */
function DataTable({
  heading,
  rows,
}: {
  heading: string;
  rows: { key: string; label: string; value: string }[];
}) {
  return (
    <details className="group/table border-border border-t pt-2">
      <summary className="text-caption text-muted-foreground hover:text-primary-strong flex min-h-11 cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden
          className="size-3.5 transition-transform group-open/table:rotate-180"
        />
        Show the numbers
      </summary>
      <div className="scroll-x mt-2">
        <table className="text-caption w-full">
          <caption className="sr-only">{heading}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-border border-b last:border-0">
                <th scope="row" className="py-1.5 text-left font-normal">
                  {row.label}
                </th>
                <td className="py-1.5 text-right tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
