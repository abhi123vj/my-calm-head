import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

import { requireSession } from "@/lib/auth/dal";
import { getMigraineById } from "@/lib/migraines/repository";
import { labelFor } from "@/lib/migraines/catalog";
import { formatLocalDate } from "@/lib/migraines/format";
import { EpisodeSummary } from "@/components/history/episode-summary";
import { DeleteEpisode } from "@/components/history/delete-episode";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        href="/history"
        className="text-body-sm text-muted-foreground hover:text-primary-strong -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 transition-colors"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to history
      </Link>

      <header className="space-y-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-title text-balance">{title}</h1>
          <p className="text-body-sm text-muted-foreground">
            {formatLocalDate(migraine.timing.startedAtLocal)}
          </p>
        </div>

        {/* Edit is the action you came here for; delete sits beside it but
            never gets the emphasis. Both are full width on a phone. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Link
            href={`/history/${migraine.id}/edit`}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Pencil aria-hidden />
            {migraine.status === "draft" ? "Continue this draft" : "Edit"}
          </Link>
          <DeleteEpisode id={migraine.id} />
        </div>
      </header>

      {migraine.status === "draft" ? (
        <Alert>
          <FileText aria-hidden />
          <AlertTitle>Saved as a draft</AlertTitle>
          <AlertDescription>
            Some questions were left unanswered. Continuing the draft picks up
            where you stopped.
          </AlertDescription>
        </Alert>
      ) : null}

      <EpisodeSummary migraine={migraine} />
    </div>
  );
}
