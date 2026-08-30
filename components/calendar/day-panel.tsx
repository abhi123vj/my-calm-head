import Link from "next/link";
import { labelFor } from "@/lib/migraines/catalog";
import { formatLocalDate, startTimeOrNull } from "@/lib/migraines/format";
import { severityBand } from "@/lib/migraines/severity-scale";
import type { Migraine } from "@/types/migraine";

/**
 * Every episode recorded on one date.
 *
 * A date can hold several, so this is always a list even for one - the shape
 * does not change when a second episode is added to the same day.
 */
export function DayPanel({
  date,
  episodes,
}: {
  date: string;
  episodes: Migraine[];
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{formatLocalDate(`${date}T00:00`)}</h2>
        <span className="text-muted-foreground text-sm">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"}
        </span>
      </div>

      {episodes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing recorded on this date.
        </p>
      ) : (
        <ul className="divide-y">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <Link
                href={`/history/${episode.id}`}
                className="hover:bg-muted/50 -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-2.5 transition-colors"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums"
                  style={{
                    backgroundColor: severityBand(episode.severity).background,
                    color: severityBand(episode.severity).foreground,
                  }}
                >
                  {episode.severity ?? "–"}
                </span>

                <span className="text-sm">
                  {startTimeOrNull(episode.timing) ?? "Time not recorded"}
                </span>

                <span className="text-muted-foreground text-sm">
                  {episode.duration.label}
                </span>

                {episode.headacheType ? (
                  <span className="text-muted-foreground text-sm">
                    {labelFor(episode.headacheType)}
                  </span>
                ) : null}

                {episode.status === "draft" ? (
                  <span className="rounded-full border border-dashed px-2 py-0.5 text-xs">
                    Draft
                  </span>
                ) : null}

                <span className="text-muted-foreground ml-auto text-xs">
                  View &rarr;
                </span>
              </Link>

              {episode.symptoms.length > 0 || episode.possibleTriggers.length > 0 ? (
                <p className="text-muted-foreground pb-2 text-xs">
                  {[
                    episode.symptoms.map(labelFor).join(", "),
                    episode.possibleTriggers.map(labelFor).join(", "),
                  ]
                    .filter((part) => part.length > 0)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
