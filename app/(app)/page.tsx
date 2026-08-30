import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, NotebookPen, Plus } from "lucide-react";

import { requireSession } from "@/lib/auth/dal";
import { listMigraines } from "@/lib/migraines/repository";
import {
  durationDistribution,
  durationStats,
  frequency,
  gapStats,
  helpedTallies,
  medicationDays,
  monthlySeries,
  ongoingEpisodes,
  periodCounts,
  recentEpisodes,
  rollingWindowSeries,
  severityStats,
  timeOfDayDistribution,
  weekdayDistribution,
  windowComparison,
} from "@/lib/migraines/stats";
import type { HelpedTally } from "@/lib/migraines/stats";
import { formatDuration } from "@/lib/time";
import {
  formatMonthAbbr,
  formatShortDate,
  startTimeOrNull,
} from "@/lib/migraines/format";
import { monthLabel } from "@/lib/migraines/calendar";
import { HELPED_LABELS, MAX_SEVERITY, labelFor } from "@/lib/migraines/catalog";
import { severityBand } from "@/lib/migraines/severity-scale";
import { elapsedMinutesSince } from "@/lib/migraines/duration";
import { MiniStat, StatTile } from "@/components/dashboard/stat-tile";
import type { Trend } from "@/components/dashboard/stat-tile";
import {
  ChartCard,
  ColumnChart,
  FrequencyBars,
  LineChart,
  SeverityDistribution,
  StackedBars,
} from "@/components/dashboard/charts";
import type { LinePoint, StackedDatum } from "@/components/dashboard/charts";
import {
  EpisodeListItem,
  EpisodeStatusBadges,
} from "@/components/migraines/episode-list-item";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Migraine } from "@/types/migraine";

export const metadata: Metadata = {
  title: "Dashboard",
};

const MONTHS_SHOWN = 12;
const TOP_N = 8;
const RECENT_N = 5;
/** The rolling window the "recently" figures are measured over. */
const WINDOW_DAYS = 30;
/** How far back the rolling line runs, sampled once a week. */
const ROLLING_WEEKS = 52;

export default async function DashboardPage() {
  await requireSession();

  // Every figure is computed over the whole history, so the dashboard reads all
  // episodes once rather than issuing an aggregate query per statistic. For a
  // single person's log this is a few hundred documents at most; if it ever
  // grows past a few thousand, move the aggregation into MongoDB.
  const episodes = await listMigraines({ sort: "oldest" });

  const now = new Date();
  const counts = periodCounts(episodes, now);
  const severity = severityStats(episodes);
  const duration = durationStats(episodes);
  const months = monthlySeries(episodes, MONTHS_SHOWN, now);
  const symptoms = frequency(episodes, (episode) => episode.symptoms, TOP_N);
  const triggers = frequency(episodes, (episode) => episode.possibleTriggers, TOP_N);
  const locations = frequency(episodes, (episode) => episode.painLocations, TOP_N);
  const recent = recentEpisodes(episodes, RECENT_N);
  const ongoing = ongoingEpisodes(episodes);

  const gaps = gapStats(episodes, now);
  const recently = windowComparison(episodes, WINDOW_DAYS, now);
  const medication = medicationDays(episodes, WINDOW_DAYS, now);
  const currentMonth = months[months.length - 1];

  const rolling = rollingLine(
    rollingWindowSeries(episodes, WINDOW_DAYS, ROLLING_WEEKS, now),
  );

  const weekdays = weekdayDistribution(episodes);
  const timeOfDay = timeOfDayDistribution(episodes);
  const durations = durationDistribution(episodes);

  const medications = helpedTallies(
    episodes.flatMap((episode) =>
      episode.medications.map((medication) => ({
        key: medication.name,
        helped: medication.helped,
      })),
    ),
  ).slice(0, TOP_N);

  const reliefs = helpedTallies(
    episodes.flatMap((episode) =>
      episode.reliefMethods.map((relief) => ({
        key: relief.method,
        helped: relief.helped,
      })),
    ),
  ).slice(0, TOP_N);

  if (episodes.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Dashboard"
        description="An overview of what you have recorded."
        action={
          <Link href="/log" className={buttonVariants()}>
            <Plus aria-hidden />
            Log an episode
          </Link>
        }
      />

      {ongoing.length > 0 ? <OngoingBanner episodes={ongoing} /> : null}

      {/* One featured figure with the period counts grouped beneath it, rather
          than four tiles of equal weight - the total is the number the screen is
          about, and the rest are its breakdown. */}
      <Card className="border-lavender-deep/50 from-lavender/70 to-card bg-gradient-to-br">
        <CardContent className="space-y-4">
          <div>
            <p className="eyebrow">Total episodes</p>
            <p className="text-display text-primary-strong tabular-nums">
              {counts.total}
            </p>
          </div>
          <div className="border-lavender-deep/40 grid grid-cols-3 gap-3 border-t pt-4">
            <MiniStat label="This week" value={String(counts.thisWeek)} note="Since Monday" />
            <MiniStat label="This month" value={String(counts.thisMonth)} />
            <MiniStat label="This year" value={String(counts.thisYear)} />
          </div>
        </CardContent>
      </Card>

      {/* The figures that change day to day, kept together and above the
          all-time averages: "how long has it been" is the question this screen
          is opened with. */}
      <section className="space-y-3">
        <h2 className="eyebrow">Where things stand</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Since the last episode"
            value={describeDaysSince(gaps.daysSinceLast)}
            note={describeGap(gaps)}
          />
          <StatTile
            label={`Last ${WINDOW_DAYS} days`}
            value={plural(recently.current, "episode")}
            trend={describeTrend(recently)}
          />
          <StatTile
            label="Headache days this month"
            value={plural(currentMonth.headacheDays, "day")}
            note={
              currentMonth.count === 0
                ? `None recorded so far in ${monthLabel({ year: now.getFullYear(), month: now.getMonth() + 1 })}.`
                : `${plural(currentMonth.count, "episode")} this month; two on one day count as one day.`
            }
          />
          <StatTile
            label="Days with medication"
            value={plural(medication.days, "day")}
            note={
              medication.episodes === 0
                ? `No episodes in the last ${WINDOW_DAYS} days.`
                : `Days in the last ${WINDOW_DAYS} days on which you recorded taking something, over ${plural(medication.episodes, "episode")}.`
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Averages</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Average severity"
            value={severity.average === null ? "—" : severity.average.toFixed(1)}
            note={
              severity.average === null
                ? "No severity recorded yet"
                : `Over ${severity.recordedCount} episode${severity.recordedCount === 1 ? "" : "s"}${
                    severity.missingCount > 0
                      ? `; ${severity.missingCount} without a severity excluded`
                      : ""
                  }`
            }
          />
          <StatTile
            label="Average duration"
            value={formatDuration(duration.averageMeasuredMinutes) ?? "—"}
            note={describeDurationBasis(duration)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Most recorded</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Symptom"
            value={symptoms[0]?.label ?? "—"}
            note={
              symptoms[0]
                ? `Recorded alongside ${symptoms[0].count} of ${counts.total} episodes`
                : "No symptoms recorded yet"
            }
          />
          <StatTile
            label="Trigger"
            value={triggers[0]?.label ?? "—"}
            note={
              triggers[0]
                ? `Recorded alongside ${triggers[0].count} of ${counts.total} episodes`
                : "No triggers recorded yet"
            }
          />
          <StatTile
            label="Pain location"
            value={locations[0]?.label ?? "—"}
            note={
              locations[0]
                ? `Recorded on ${locations[0].count} of ${counts.total} episodes`
                : "No pain locations recorded yet"
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Recent episodes</h2>
        <Card className="py-0">
          <div className="divide-border divide-y">
            <RecentList episodes={recent} />
          </div>
          {counts.total > recent.length ? (
            <Link
              href="/history"
              className="text-body-sm text-primary-strong hover:bg-lavender/50 border-border flex min-h-11 items-center justify-center border-t font-medium transition-colors"
            >
              View all {counts.total} episodes
            </Link>
          ) : null}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Over time</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Given the width of the grid: a line is read left to right, and
              squeezing a year of it into half a row makes every rise look
              alarming. */}
          <ChartCard
            className="lg:col-span-2"
            title={`Episodes in a rolling ${WINDOW_DAYS} days`}
            description={`Each point counts the episodes in the ${WINDOW_DAYS} days ending on it, sampled weekly. A month is an arbitrary place to cut a run of episodes; a window that slides has no edges for one to hide behind.`}
          >
            <LineChart
              tableHeading={`Episodes in the ${WINDOW_DAYS} days to each date`}
              summary={`A line chart of how many episodes fell in the ${WINDOW_DAYS} days ending on each weekly sample, over the last year. The figures are in the table below.`}
              emptyMessage={`This needs ${WINDOW_DAYS} days of records before it can plot a point. Keep logging and it will fill in.`}
              data={rolling}
            />
          </ChartCard>

          <ChartCard
            title="Episodes per month"
            description={`The last ${MONTHS_SHOWN} months. Empty months are shown so a quiet stretch stays visible.`}
          >
            <ColumnChart
              tableHeading="Episodes per month"
              emptyMessage="No episodes in the last 12 months."
              data={months.map((point) => ({
                key: point.key,
                label: point.label,
                sublabel: point.label === "Jan" ? String(point.year) : undefined,
                value: point.count,
                // Months where episodes doubled up on a day say so, so the bar
                // is not read as a count of days off.
                displayValue:
                  point.count === point.headacheDays
                    ? String(point.count)
                    : `${point.count} on ${point.headacheDays} days`,
                title: `${point.label} ${point.year}: ${point.count} episode${
                  point.count === 1 ? "" : "s"
                } on ${point.headacheDays} day${point.headacheDays === 1 ? "" : "s"}`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Average severity per month"
            description="Drawn on the full 1-10 scale, so a bar height means the same thing in every month. Months with no recorded severity are blank rather than zero."
          >
            <ColumnChart
              tableHeading="Average severity per month"
              emptyMessage="No severity recorded in the last 12 months."
              maxValue={MAX_SEVERITY}
              data={months.map((point) => ({
                key: point.key,
                label: point.label,
                sublabel: point.label === "Jan" ? String(point.year) : undefined,
                value: point.averageSeverity ?? 0,
                // A month with nothing recorded has no average; 0 is only a bar
                // height, so the table shows it as absent rather than as zero.
                displayValue:
                  point.averageSeverity === null
                    ? "—"
                    : point.averageSeverity.toFixed(1),
                color: severityBand(
                  point.averageSeverity === null
                    ? null
                    : Math.round(point.averageSeverity),
                ).background,
                title:
                  point.averageSeverity === null
                    ? `${point.label} ${point.year}: no severity recorded`
                    : `${point.label} ${point.year}: average severity ${point.averageSeverity.toFixed(1)} of 10`,
              }))}
            />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Patterns</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Day of the week"
            description={`Which day episodes started on, across all ${counts.total} of them.`}
          >
            <ColumnChart
              tableHeading="Episodes by day of the week"
              emptyMessage="Nothing recorded yet."
              data={weekdays.map((point) => ({
                key: point.key,
                label: point.label,
                value: point.count,
                title: `${point.label}: ${plural(point.count, "episode")}`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Time of day"
            description={describeTimeOfDayBasis(timeOfDay)}
          >
            <ColumnChart
              tableHeading="Episodes by time of day"
              emptyMessage="No start times have been recorded yet."
              data={timeOfDay.buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.count,
                title: `${bucket.label}: ${plural(bucket.count, "episode")}`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="How long episodes lasted"
            description={describeDurationBuckets(durations)}
          >
            <ColumnChart
              tableHeading="Measured episodes by length"
              emptyMessage="No episode has a measured duration yet."
              data={durations.buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.count,
                title: `${bucket.label}: ${plural(bucket.count, "episode")}`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Severity distribution"
            description="How often each level was recorded."
          >
            <SeverityDistribution
              distribution={severity.distribution}
              total={severity.recordedCount}
            />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">What you recorded</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Most recorded symptoms"
            description={`Across ${counts.total} episode${counts.total === 1 ? "" : "s"}.`}
          >
            <FrequencyBars
              tableHeading="Symptom frequency"
              emptyMessage="No symptoms recorded yet."
              data={symptoms.map((entry) => ({
                key: entry.value,
                label: entry.label,
                value: entry.count,
                detail: `${entry.count} of ${counts.total} episodes (${Math.round(entry.share * 100)}%)`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Most recorded triggers"
            description="What you noted around these episodes. This does not mean any of them caused a migraine."
          >
            <FrequencyBars
              tableHeading="Trigger frequency"
              emptyMessage="No triggers recorded yet."
              data={triggers.map((entry) => ({
                key: entry.value,
                label: entry.label,
                value: entry.count,
                detail: `${entry.count} of ${counts.total} episodes (${Math.round(entry.share * 100)}%)`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Where the pain was"
            description={`Across ${counts.total} episode${counts.total === 1 ? "" : "s"}. One episode can have more than one location.`}
          >
            <FrequencyBars
              tableHeading="Pain location frequency"
              emptyMessage="No pain locations recorded yet."
              data={locations.map((entry) => ({
                key: entry.value,
                label: entry.label,
                value: entry.count,
                detail: `${entry.count} of ${counts.total} episodes (${Math.round(entry.share * 100)}%)`,
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Medications you recorded"
            description="How often you took each one, and what you noted afterwards. This describes your notes, not whether anything worked."
          >
            <StackedBars
              tableHeading="Medications recorded"
              emptyMessage="No medications recorded yet."
              legend={HELPED_SEGMENTS}
              data={medications.map((tally) => helpedDatum(tally, "medication"))}
            />
          </ChartCard>

          <ChartCard
            title="Other things you tried"
            description="Relief methods recorded alongside episodes, with what you noted afterwards."
          >
            <StackedBars
              tableHeading="Relief methods recorded"
              emptyMessage="No relief methods recorded yet."
              legend={HELPED_SEGMENTS}
              data={reliefs.map((tally) => helpedDatum(tally, "relief"))}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

/**
 * The four "helped" answers as an ordered ramp, dark to light, ending in the
 * neutral lavender for notes that were never made. It is a single hue because
 * these are degrees of one answer, not four unrelated categories - and no
 * green or red, because the app does not grade what someone took.
 */
const HELPED_SEGMENTS = [
  { key: "yes", label: HELPED_LABELS.yes, color: "var(--chart-5)" },
  { key: "unsure", label: HELPED_LABELS.unsure, color: "var(--chart-1)" },
  { key: "no", label: HELPED_LABELS.no, color: "var(--chart-3)" },
  { key: "unrecorded", label: "Not noted", color: "var(--lavender-strong)" },
] as const;

function helpedDatum(tally: HelpedTally, prefix: string): StackedDatum {
  const values: Record<string, number> = {
    yes: tally.yes,
    unsure: tally.unsure,
    no: tally.no,
    unrecorded: tally.unrecorded,
  };

  const parts = HELPED_SEGMENTS.filter(
    (segment) => values[segment.key] > 0,
  ).map((segment) => `${values[segment.key]} ${segment.label.toLowerCase()}`);

  return {
    key: `${prefix}-${tally.key}`,
    label: labelFor(tally.key),
    total: tally.total,
    segments: HELPED_SEGMENTS.map((segment) => ({
      key: segment.key,
      label: segment.label,
      value: values[segment.key],
      color: segment.color,
    })),
    detail: `${plural(tally.total, "episode")}: ${parts.join(", ")}`,
  };
}

/**
 * The rolling series as points on a line.
 *
 * A tick is printed only where the month turns over, so the axis reads as a
 * year rather than as fifty-two dates.
 */
function rollingLine(series: ReturnType<typeof rollingWindowSeries>): LinePoint[] {
  return series.map((point, index) => {
    const local = `${point.date}T00:00`;
    const month = point.date.slice(0, 7);
    const previousMonth = index === 0 ? null : series[index - 1].date.slice(0, 7);
    const days = `on ${plural(point.headacheDays, "day")}`;

    return {
      key: point.date,
      label: formatShortDate(local),
      value: point.count,
      tick: month === previousMonth ? undefined : formatMonthAbbr(local),
      displayValue:
        point.count === point.headacheDays
          ? String(point.count)
          : `${point.count} ${days}`,
      title: `${plural(point.count, "episode")} in the ${WINDOW_DAYS} days to ${formatShortDate(local)}, ${days}`,
    };
  });
}

function describeDaysSince(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  return plural(days, "day");
}

function describeGap(gaps: ReturnType<typeof gapStats>): string {
  if (gaps.lastDate === null) return "Nothing recorded yet.";

  const last = `Last recorded ${formatShortDate(`${gaps.lastDate}T00:00`)}.`;
  if (gaps.currentIsLongest) {
    return `${last} That is the longest stretch without one in your record.`;
  }
  // Every recorded day so far runs into the next, so there is no stretch to name.
  if (gaps.longestClearRun === 0) {
    return `${last} No clear day between recorded episodes yet.`;
  }
  return `${last} Your longest stretch without one is ${plural(gaps.longestClearRun, "day")}.`;
}

function describeTrend(comparison: ReturnType<typeof windowComparison>): Trend {
  const { windowDays, previous, change, previousWindowCovered } = comparison;

  // Comparing against days you were not yet logging would describe the record
  // growing, not the episodes changing.
  if (!previousWindowCovered) {
    return {
      direction: "level",
      label: `Your record does not yet cover the ${windowDays} days before this.`,
    };
  }

  if (change === 0) {
    return {
      direction: "level",
      label: `The same as the ${windowDays} days before (${previous}).`,
    };
  }

  return {
    direction: change > 0 ? "up" : "down",
    label: `${Math.abs(change)} ${change > 0 ? "more" : "fewer"} than the ${windowDays} days before (${previous}).`,
  };
}

function describeTimeOfDayBasis(
  stats: ReturnType<typeof timeOfDayDistribution>,
): string {
  const base = "When episodes started, over the ones with a time recorded.";
  return stats.unknownCount === 0
    ? base
    : `${base} ${plural(stats.unknownCount, "episode")} with no recorded time ${
        stats.unknownCount === 1 ? "is" : "are"
      } left out rather than placed in a bucket.`;
}

function describeDurationBuckets(
  distribution: ReturnType<typeof durationDistribution>,
): string {
  const excluded: string[] = [];
  if (distribution.estimatedCount > 0) {
    excluded.push(`${distribution.estimatedCount} recorded as a range`);
  }
  if (distribution.ongoingCount > 0) {
    excluded.push(`${distribution.ongoingCount} still ongoing`);
  }
  if (distribution.unknownCount > 0) {
    excluded.push(`${distribution.unknownCount} with no duration`);
  }

  const base = `${plural(distribution.measuredCount, "episode")} with a measured length.`;
  return excluded.length === 0
    ? base
    : `${base} Left out: ${excluded.join(", ")}.`;
}

function describeDurationBasis(duration: ReturnType<typeof durationStats>): string {
  if (duration.averageMeasuredMinutes === null) {
    return duration.estimatedCount > 0
      ? `No measured durations yet; ${duration.estimatedCount} recorded as a range`
      : "No durations recorded yet";
  }

  const parts = [
    `Over ${duration.measuredCount} measured episode${duration.measuredCount === 1 ? "" : "s"}`,
  ];
  // Band selections are deliberately kept out of the headline average; naming
  // them here means the excluded episodes are never invisible.
  if (duration.estimatedCount > 0) {
    const withEstimates = formatDuration(duration.averageWithEstimatesMinutes);
    parts.push(
      `${duration.estimatedCount} recorded as a range (${withEstimates} including those)`,
    );
  }
  if (duration.ongoingCount > 0) parts.push(`${duration.ongoingCount} still ongoing`);
  if (duration.unknownCount > 0) parts.push(`${duration.unknownCount} unknown`);

  return `${parts.join("; ")}.`;
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function OngoingBanner({ episodes }: { episodes: Migraine[] }) {
  return (
    <Alert variant="info">
      <CircleAlert aria-hidden />
      <AlertTitle>
        {episodes.length === 1
          ? "An episode is still marked as ongoing"
          : `${episodes.length} episodes are still marked as ongoing`}
      </AlertTitle>
      <AlertDescription>
        <ul className="space-y-1.5">
          {episodes.map((episode) => {
            const elapsed = formatDuration(
              elapsedMinutesSince(episode.timing.startedAt),
            );
            return (
              <li key={episode.id}>
                <Link
                  href={`/history/${episode.id}/edit`}
                  className="text-primary-strong font-medium underline underline-offset-4"
                >
                  {formatShortDate(episode.timing.startedAtLocal)}
                  {elapsed ? ` · started ${elapsed} ago` : ""}
                </Link>
                <span> — record an end time</span>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function RecentList({ episodes }: { episodes: Migraine[] }) {
  if (episodes.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground p-4">Nothing recorded yet.</p>
    );
  }

  return (
    <>
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.id}
          href={`/history/${episode.id}`}
          severity={episode.severity}
          title={formatShortDate(episode.timing.startedAtLocal)}
          meta={[
            startTimeOrNull(episode.timing) ?? "time not recorded",
            episode.duration.label,
            episode.headacheType ? labelFor(episode.headacheType) : null,
          ]}
          badges={
            <EpisodeStatusBadges
              status={episode.status}
              ongoing={episode.duration.kind === "ongoing"}
            />
          }
        />
      ))}
    </>
  );
}

function EmptyDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="An overview of what you have recorded."
      />

      <EmptyState
        icon={NotebookPen}
        title="Nothing recorded yet"
        description="Statistics, trends and your calendar appear here once you have logged an episode."
        action={
          <Link href="/log" className={buttonVariants()}>
            <Plus aria-hidden />
            Log your first episode
          </Link>
        }
      />
    </div>
  );
}
