import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { listMigraines } from "@/lib/migraines/repository";
import {
  durationStats,
  frequency,
  monthlySeries,
  ongoingEpisodes,
  periodCounts,
  recentEpisodes,
  severityStats,
} from "@/lib/migraines/stats";
import { formatDuration } from "@/lib/time";
import {
  formatShortDate,
  startTimeOrNull,
} from "@/lib/migraines/format";
import { labelFor } from "@/lib/migraines/catalog";
import { severityBand } from "@/lib/migraines/severity-scale";
import { elapsedMinutesSince } from "@/lib/migraines/duration";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  ChartCard,
  ColumnChart,
  FrequencyBars,
  SeverityDistribution,
} from "@/components/dashboard/charts";
import { buttonVariants } from "@/components/ui/button";
import type { Migraine } from "@/types/migraine";

export const metadata: Metadata = {
  title: "Dashboard",
};

const MONTHS_SHOWN = 12;
const TOP_N = 8;
const RECENT_N = 5;

export default async function DashboardPage() {
  await requireSession();

  // Every figure is computed over the whole history, so the dashboard reads all
  // episodes once rather than issuing an aggregate query per statistic. For a
  // single person's log this is a few hundred documents at most; if it ever
  // grows past a few thousand, move the aggregation into MongoDB.
  const episodes = await listMigraines({ sort: "oldest" });

  const counts = periodCounts(episodes);
  const severity = severityStats(episodes);
  const duration = durationStats(episodes);
  const months = monthlySeries(episodes, MONTHS_SHOWN);
  const symptoms = frequency(episodes, (episode) => episode.symptoms, TOP_N);
  const triggers = frequency(episodes, (episode) => episode.possibleTriggers, TOP_N);
  const recent = recentEpisodes(episodes, RECENT_N);
  const ongoing = ongoingEpisodes(episodes);

  if (episodes.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            An overview of what you have recorded.
          </p>
        </div>
        <Link href="/log" className={buttonVariants()}>
          Log an episode
        </Link>
      </div>

      {ongoing.length > 0 ? <OngoingBanner episodes={ongoing} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total episodes" value={String(counts.total)} />
        <StatTile label="This week" value={String(counts.thisWeek)} note="Since Monday" />
        <StatTile label="This month" value={String(counts.thisMonth)} />
        <StatTile label="This year" value={String(counts.thisYear)} />

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

        <StatTile
          label="Most recorded symptom"
          value={symptoms[0]?.label ?? "—"}
          note={
            symptoms[0]
              ? `Recorded alongside ${symptoms[0].count} of ${counts.total} episodes`
              : "No symptoms recorded yet"
          }
        />

        <StatTile
          label="Most recorded trigger"
          value={triggers[0]?.label ?? "—"}
          note={
            triggers[0]
              ? `Recorded alongside ${triggers[0].count} of ${counts.total} episodes`
              : "No triggers recorded yet"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              title: `${point.label} ${point.year}: ${point.count} episode${
                point.count === 1 ? "" : "s"
              }`,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Average severity per month"
          description="Months with no recorded severity are blank rather than zero."
        >
          <ColumnChart
            tableHeading="Average severity per month"
            emptyMessage="No severity recorded in the last 12 months."
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

        <ChartCard
          title="Severity distribution"
          description="How often each level was recorded."
        >
          <SeverityDistribution
            distribution={severity.distribution}
            total={severity.recordedCount}
          />
        </ChartCard>

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

        <ChartCard title="Recent episodes">
          <RecentList episodes={recent} />
        </ChartCard>
      </div>
    </div>
  );
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

function OngoingBanner({ episodes }: { episodes: Migraine[] }) {
  return (
    <div className="border-primary space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">
        {episodes.length === 1
          ? "An episode is still marked as ongoing"
          : `${episodes.length} episodes are still marked as ongoing`}
      </p>
      <ul className="space-y-1 text-sm">
        {episodes.map((episode) => {
          const elapsed = formatDuration(
            elapsedMinutesSince(episode.timing.startedAt),
          );
          return (
            <li key={episode.id}>
              <Link
                href={`/history/${episode.id}/edit`}
                className="underline underline-offset-4"
              >
                {formatShortDate(episode.timing.startedAtLocal)}
                {elapsed ? ` · started ${elapsed} ago` : ""}
              </Link>
              <span className="text-muted-foreground"> — record an end time</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecentList({ episodes }: { episodes: Migraine[] }) {
  if (episodes.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing recorded yet.</p>;
  }

  return (
    <ul className="divide-y">
      {episodes.map((episode) => (
        <li key={episode.id}>
          <Link
            href={`/history/${episode.id}`}
            className="hover:bg-muted/50 -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-2 transition-colors"
          >
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
              style={{
                backgroundColor: severityBand(episode.severity).background,
                color: severityBand(episode.severity).foreground,
              }}
            >
              {episode.severity ?? "–"}
            </span>
            <span className="text-sm">
              {formatShortDate(episode.timing.startedAtLocal)}
            </span>
            <span className="text-muted-foreground text-sm">
              {startTimeOrNull(episode.timing) ?? "time not recorded"}
            </span>
            <span className="text-muted-foreground text-sm">
              {episode.duration.label}
            </span>
            {episode.headacheType ? (
              <span className="text-muted-foreground text-sm">
                {labelFor(episode.headacheType)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          An overview of what you have recorded.
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nothing recorded yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Statistics appear here once you have logged an episode.
        </p>
        <Link href="/log" className={`${buttonVariants()} mt-4`}>
          Log your first episode
        </Link>
      </div>
    </div>
  );
}
