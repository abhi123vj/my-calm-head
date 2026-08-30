import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/dal";
import { getMigraineById } from "@/lib/migraines/repository";
import { labelFor } from "@/lib/migraines/catalog";
import { formatLocalDate } from "@/lib/migraines/format";
import { EpisodeSummary } from "@/components/history/episode-summary";
import { DeleteEpisode } from "@/components/history/delete-episode";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(
  props: PageProps<"/history/[id]">,
): Promise<Metadata> {
  await requireSession();
  const { id } = await props.params;
  const migraine = await getMigraineById(id);

  return {
    title: migraine
      ? formatLocalDate(migraine.timing.startedAtLocal)
      : "Episode not found",
  };
}

export default async function EpisodePage(props: PageProps<"/history/[id]">) {
  await requireSession();

  const { id } = await props.params;
  const migraine = await getMigraineById(id);
  if (!migraine) notFound();

  const title = migraine.headacheType
    ? labelFor(migraine.headacheType)
    : "Episode";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/history"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          &larr; Back to history
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">
              {formatLocalDate(migraine.timing.startedAtLocal)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/history/${migraine.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {migraine.status === "draft" ? "Continue this draft" : "Edit"}
            </Link>
            <DeleteEpisode id={migraine.id} />
          </div>
        </div>

        {migraine.status === "draft" ? (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm">
            This episode is saved as a draft. Some questions were left
            unanswered.
          </p>
        ) : null}
      </div>

      <EpisodeSummary migraine={migraine} />
    </div>
  );
}
