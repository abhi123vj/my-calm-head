import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, List, Plus, SearchX } from "lucide-react";

import { requireSession } from "@/lib/auth/dal";
import { countMigraines, listMigraines } from "@/lib/migraines/repository";
import {
  HISTORY_PAGE_SIZE,
  historyHref,
  parseHistoryQuery,
} from "@/lib/migraines/filters";
import { labelFor } from "@/lib/migraines/catalog";
import { formatShortDate, startTimeOrNull } from "@/lib/migraines/format";
import { FilterPanel } from "@/components/history/filter-panel";
import { EpisodeStatusBadges } from "@/components/migraines/episode-list-item";
import { SeverityMark } from "@/components/migraines/severity-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Migraine } from "@/types/migraine";

export const metadata: Metadata = {
  title: "History",
};

/** How many recorded values a row shows before summarising the rest. */
const FACTS_SHOWN = 4;

export default async function HistoryPage(props: PageProps<"/history">) {
  await requireSession();

  const query = parseHistoryQuery(await props.searchParams);
  const skip = (query.page - 1) * HISTORY_PAGE_SIZE;

  const [episodes, total] = await Promise.all([
    listMigraines({
      ...query.filter,
      sort: query.sort,
      limit: HISTORY_PAGE_SIZE,
      skip,
    }),
    countMigraines(query.filter),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

  return (
    <div className="space-y-5">
      <PageHeader
        title="History"
        description={
          total === 0
            ? "No episodes match."
            : `${total} episode${total === 1 ? "" : "s"}${
                lastPage > 1 ? ` · page ${query.page} of ${lastPage}` : ""
              }`
        }
        action={
          <Link href="/log" className={buttonVariants()}>
            <Plus aria-hidden />
            Log an episode
          </Link>
        }
      />

      <FilterPanel filter={query.filter} />

      {episodes.length === 0 ? (
        <EmptyState
          icon={Object.keys(query.filter).length > 0 ? SearchX : List}
          title={
            Object.keys(query.filter).length > 0
              ? "No episodes match these filters"
              : "Nothing logged yet"
          }
          description={
            Object.keys(query.filter).length > 0
              ? "Try widening the date range or clearing a filter group."
              : "Your episodes will be listed here once you record one."
          }
          action={
            Object.keys(query.filter).length > 0 ? (
              <Link
                href="/history"
                className={buttonVariants({ variant: "secondary" })}
              >
                Clear the filters
              </Link>
            ) : (
              <Link href="/log" className={buttonVariants()}>
                <Plus aria-hidden />
                Log your first episode
              </Link>
            )
          }
        />
      ) : (
        <ul className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border shadow-card">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeRow episode={episode} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          {query.page > 1 ? (
            <Link
              href={historyHref(query, { page: query.page - 1 })}
              rel="prev"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft aria-hidden />
              Previous
            </Link>
          ) : (
            <span className="flex-1" />
          )}

          <span className="text-caption text-muted-foreground flex-1 text-center tabular-nums">
            Page {query.page} of {lastPage}
          </span>

          {query.page < lastPage ? (
            <Link
              href={historyHref(query, { page: query.page + 1 })}
              rel="next"
              className={buttonVariants({ variant: "outline" })}
            >
              Next
              <ArrowRight aria-hidden />
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>
      ) : null}
    </div>
  );
}

/**
 * One episode as a card row.
 *
 * The severity is a tinted mark on the left rather than a number stranded at
 * the right end of a wrapping flex row, which is what made the old row hard to
 * scan on a phone: the date, time, badges and severity all reflowed
 * independently. Here the mark is fixed, the text column wraps within itself,
 * and the recorded values sit below as badges instead of a three-row
 * label/value table.
 */
function EpisodeRow({ episode }: { episode: Migraine }) {
  const startTime = startTimeOrNull(episode.timing);

  return (
    <Link
      href={`/history/${episode.id}`}
      className="hover:bg-lavender/50 flex items-start gap-3 p-4 transition-colors"
    >
      <SeverityMark severity={episode.severity} size="md" className="mt-0.5" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-subheading">
            {formatShortDate(episode.timing.startedAtLocal)}
          </span>
          <EpisodeStatusBadges
            status={episode.status}
            ongoing={episode.duration.kind === "ongoing"}
          />
          <span className="text-caption text-muted-foreground ml-auto shrink-0 tabular-nums">
            {episode.severity === null ? "—" : `${episode.severity}/10`}
          </span>
        </div>

        <p className="text-caption text-muted-foreground">
          {[
            startTime ?? "time not recorded",
            episode.duration.label,
            episode.headacheType ? labelFor(episode.headacheType) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <RowFacts episode={episode} />
      </div>
    </Link>
  );
}

/**
 * What was recorded, at a glance.
 *
 * Capped rather than complete: an episode with fifteen symptoms would otherwise
 * make its row four times the height of its neighbours and turn the list into
 * something that has to be read rather than scanned. The full set is on the
 * episode's own page.
 */
function RowFacts({ episode }: { episode: Migraine }) {
  const values = [
    ...episode.symptoms.map(labelFor),
    ...episode.possibleTriggers.map(labelFor),
    ...episode.medications.map((medication) => medication.name),
  ].filter((value) => value.trim().length > 0);

  if (values.length === 0) return null;

  const shown = values.slice(0, FACTS_SHOWN);
  const remaining = values.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((value, index) => (
        <Badge key={`${value}-${index}`} variant="outline">
          {value}
        </Badge>
      ))}
      {remaining > 0 ? (
        <Badge variant="default">+{remaining} more</Badge>
      ) : null}
    </div>
  );
}
