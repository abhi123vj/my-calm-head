import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { countMigraines, listMigraines } from "@/lib/migraines/repository";
import {
  HISTORY_PAGE_SIZE,
  historyHref,
  parseHistoryQuery,
} from "@/lib/migraines/filters";
import { labelFor } from "@/lib/migraines/catalog";
import {
  formatShortDate,
  startTimeOrNull,
} from "@/lib/migraines/format";
import { FilterPanel } from "@/components/history/filter-panel";
import { buttonVariants } from "@/components/ui/button";
import type { Migraine } from "@/types/migraine";

export const metadata: Metadata = {
  title: "History",
};

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="text-muted-foreground text-sm">
            {total === 0
              ? "No episodes match."
              : `${total} episode${total === 1 ? "" : "s"}${
                  lastPage > 1 ? ` · page ${query.page} of ${lastPage}` : ""
                }`}
          </p>
        </div>
        <Link href="/log" className={buttonVariants()}>
          Log an episode
        </Link>
      </div>

      <FilterPanel filter={query.filter} />

      {episodes.length === 0 ? (
        <EmptyState hasFilters={Object.keys(query.filter).length > 0} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeRow episode={episode} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 ? (
        <nav className="flex items-center justify-between gap-2">
          {query.page > 1 ? (
            <Link
              href={historyHref(query, { page: query.page - 1 })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {query.page < lastPage ? (
            <Link
              href={historyHref(query, { page: query.page + 1 })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function EpisodeRow({ episode }: { episode: Migraine }) {
  const startTime = startTimeOrNull(episode.timing);

  return (
    <Link
      href={`/history/${episode.id}`}
      className="hover:bg-muted/50 block px-4 py-3 transition-colors"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">
          {formatShortDate(episode.timing.startedAtLocal)}
        </span>
        <span className="text-muted-foreground text-sm">
          {startTime ?? "time not recorded"}
        </span>
        {episode.status === "draft" ? (
          <span className="rounded-full border border-dashed px-2 py-0.5 text-xs">
            Draft
          </span>
        ) : null}
        {episode.duration.kind === "ongoing" ? (
          <span className="border-primary text-primary rounded-full border px-2 py-0.5 text-xs">
            Ongoing
          </span>
        ) : null}
        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {episode.severity === null ? "—" : `${episode.severity}/10`}
        </span>
      </div>

      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
        <span>{episode.duration.label}</span>
        {episode.headacheType ? <span>{labelFor(episode.headacheType)}</span> : null}
      </div>

      <RowFacts episode={episode} />
    </Link>
  );
}

/** The three lists the history view is expected to show at a glance. */
function RowFacts({ episode }: { episode: Migraine }) {
  const facts: { label: string; values: string[] }[] = [
    { label: "Symptoms", values: episode.symptoms.map(labelFor) },
    { label: "Triggers", values: episode.possibleTriggers.map(labelFor) },
    {
      label: "Medication",
      values: episode.medications.map((medication) => medication.name),
    },
  ].filter((fact) => fact.values.length > 0);

  if (facts.length === 0) return null;

  return (
    <dl className="mt-2 space-y-0.5 text-xs">
      {facts.map((fact) => (
        <div key={fact.label} className="flex gap-2">
          <dt className="text-muted-foreground w-20 shrink-0">{fact.label}</dt>
          <dd className="min-w-0">{fact.values.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm font-medium">
        {hasFilters ? "No episodes match these filters." : "Nothing logged yet."}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {hasFilters ? (
          <Link href="/history" className="underline underline-offset-4">
            Clear the filters
          </Link>
        ) : (
          <Link href="/log" className="underline underline-offset-4">
            Log your first episode
          </Link>
        )}
      </p>
    </div>
  );
}
