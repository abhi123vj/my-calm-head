import { labelFor } from "@/lib/migraines/catalog";
import { formatLocalDate, startTimeOrNull } from "@/lib/migraines/format";
import {
  EpisodeListItem,
  EpisodeStatusBadges,
} from "@/components/migraines/episode-list-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="py-0">
      <CardHeader className="border-border flex-row items-baseline justify-between gap-2 border-b py-4">
        <CardTitle as="h2">{formatLocalDate(`${date}T00:00`)}</CardTitle>
        <span className="text-body-sm text-muted-foreground shrink-0">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"}
        </span>
      </CardHeader>

      {episodes.length === 0 ? (
        <CardContent className="pb-5">
          <p className="text-body-sm text-muted-foreground">
            Nothing recorded on this date.
          </p>
        </CardContent>
      ) : (
        <ul className="divide-border divide-y">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeListItem
                href={`/history/${episode.id}`}
                severity={episode.severity}
                title={startTimeOrNull(episode.timing) ?? "Time not recorded"}
                meta={[
                  episode.duration.label,
                  episode.headacheType ? labelFor(episode.headacheType) : null,
                ]}
                footnote={
                  [
                    episode.symptoms.map(labelFor).join(", "),
                    episode.possibleTriggers.map(labelFor).join(", "),
                  ]
                    .filter((part) => part.length > 0)
                    .join(" · ") || null
                }
                badges={
                  <EpisodeStatusBadges
                    status={episode.status}
                    ongoing={episode.duration.kind === "ongoing"}
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
