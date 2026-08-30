import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, NotebookPen, Plus } from "lucide-react";

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
import { formatShortDate, startTimeOrNull } from "@/lib/migraines/format";
import { labelFor } from "@/lib/migraines/catalog";
import { severityBand } from "@/lib/migraines/severity-scale";
import { elapsedMinutesSince } from "@/lib/migraines/duration";
import { MiniStat, StatTile } from "@/components/dashboard/stat-tile";
import {
  ChartCard,
  ColumnChart,
  FrequencyBars,
  SeverityDistribution,
} from "@/components/dashboard/charts";
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
        <div className="grid gap-3 sm:grid-cols-2">
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
        <h2 className="eyebrow">Trends</h2>
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
        </div>
      </section>
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
