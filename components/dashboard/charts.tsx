import { severityBand } from "@/lib/migraines/severity-scale";

/**
 * Charts built from plain elements rather than a charting library.
 *
 * Every chart here is a bar chart, which CSS draws exactly and accessibly with
 * no dependency, no client JavaScript, and no hydration. Each one carries a
 * `title` for hover detail and a collapsed table underneath, so the numbers are
 * always reachable without relying on colour or on pointer hover.
 */

/** Categorical slot 1, 4.30:1 against the page surface. */
const BAR_COLOR = "#2a78d6";

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
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  // Only a single, unambiguous peak earns a direct label.
  const peakKey =
    data.filter((datum) => datum.value === max).length === 1
      ? data.find((datum) => datum.value === max)?.key
      : undefined;

  return (
    <div className="space-y-3">
      <div className="flex h-36 items-end gap-1">
        {data.map((datum) => {
          const isPeak = datum.key === peakKey;
          return (
            <div
              key={datum.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={datum.title}
            >
              {isPeak ? (
                <span className="text-[10px] leading-none font-medium tabular-nums">
                  {formatValue(datum.value)}
                  {valueSuffix}
                </span>
              ) : null}
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: `${(datum.value / max) * 100}%`,
                  minHeight: datum.value > 0 ? 2 : 0,
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
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {data.map((datum) => (
          <li key={datum.key} className="space-y-1" title={datum.detail}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{datum.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {datum.value}
              </span>
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
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
    return (
      <p className="text-muted-foreground text-sm">
        No severity has been recorded yet.
      </p>
    );
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

/** Always available, so no figure depends on hovering or on seeing colour. */
function DataTable({
  heading,
  rows,
}: {
  heading: string;
  rows: { key: string; label: string; value: string }[];
}) {
  return (
    <details className="text-xs">
      <summary className="text-muted-foreground cursor-pointer">
        Show the numbers
      </summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{heading}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <th scope="row" className="py-1 text-left font-normal">
                {row.label}
              </th>
              <td className="py-1 text-right tabular-nums">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
