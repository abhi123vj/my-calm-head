import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/dal";
import { getMigraineById } from "@/lib/migraines/repository";
import { formatLocalDate } from "@/lib/migraines/format";
import { LogWizard } from "@/components/log/log-wizard";
import { stateFromMigraine } from "@/components/log/wizard-state";

export const metadata: Metadata = {
  title: "Edit episode",
};

/**
 * The same wizard as `/log`, rehydrated from a stored episode. This is also how
 * a draft is resumed - a draft is just an episode with unanswered questions,
 * and saving from here can promote it to complete.
 */
export default async function EditEpisodePage(
  props: PageProps<"/history/[id]/edit">,
) {
  await requireSession();

  const { id } = await props.params;
  const migraine = await getMigraineById(id);
  if (!migraine) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link
        href={`/history/${migraine.id}`}
        className="text-body-sm text-muted-foreground hover:text-primary-strong -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 transition-colors"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to {formatLocalDate(migraine.timing.startedAtLocal)}
      </Link>

      <LogWizard
        editingId={migraine.id}
        initialState={stateFromMigraine(migraine)}
      />
    </div>
  );
}
