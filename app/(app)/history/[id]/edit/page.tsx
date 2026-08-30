import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="space-y-6">
      <Link
        href={`/history/${migraine.id}`}
        className="text-muted-foreground text-sm underline underline-offset-4"
      >
        &larr; Back to {formatLocalDate(migraine.timing.startedAtLocal)}
      </Link>

      <LogWizard
        editingId={migraine.id}
        initialState={stateFromMigraine(migraine)}
      />
    </div>
  );
}
