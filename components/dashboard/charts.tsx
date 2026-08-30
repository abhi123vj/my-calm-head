import { ChevronDown } from "lucide-react";

import { severityBand } from "@/lib/migraines/severity-scale";
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
 * Every chart here is a bar chart, which CSS draws exactly and accessibly with
 * no dependency, no client JavaScript, and no hydration. Each one carries a
 * `title` for hover detail and a collapsed table underneath, so the numbers are
 * always reachable without relying on colour or on pointer hover.
 */

/** The theme's indigo, 4.9:1 against the page background. */
const BAR_COLOR = "var(--chart-1)";

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
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
 */
export function ColumnChart({
  data,
  valueSuffix = "",
  emptyMessage = "Nothing recorded yet.",
  tableHeading,
}: {
  data: ColumnDatum[];
  valueSuffix?: string;
  emptyMessage?: string;
  tableHeading: string;
}) {
  const max = Math.max(...data.map((datum) => datum.value), 0);

  if (max === 0) {
    return <ChartEmpty>{emptyMessage}</ChartEmpty>;
  }

  // Only a single, unambiguous peak earns a direct label.
  const peakKey =
    data.filter((datum) => datum.value === max).length === 1
      ? data.find((datum) => datum.value === max)?.key
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
