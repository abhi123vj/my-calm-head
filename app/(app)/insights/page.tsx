import type { Metadata } from "next";
import Link from "next/link";
import { Info, Lightbulb, Plus } from "lucide-react";

import { requireSession } from "@/lib/auth/dal";
import { listMigraines } from "@/lib/migraines/repository";
import { buildInsights } from "@/lib/migraines/insights";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  await requireSession();

  const episodes = await listMigraines({ sort: "oldest" });
  const sections = buildInsights(episodes);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Insights"
        description="Descriptions of what you have recorded."
      />

      {/* Stated once, up front, rather than repeated as a caveat on every line.
          The statements themselves are worded so they cannot be read as claims
          about cause. */}
      <Alert variant="info">
        <Info aria-hidden />
        <AlertTitle>These describe your records only</AlertTitle>
        <AlertDescription>
          Everything below is counted from what you entered. A trigger listed
          here was recorded alongside an episode &mdash; that is not evidence it
          caused one. Nothing here is a diagnosis or medical advice.
        </AlertDescription>
      </Alert>

      {episodes.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nothing to describe yet"
          description="Insights appear once you have logged some episodes."
          action={
            <Link href="/log" className={buttonVariants()}>
              <Plus aria-hidden />
              Log your first episode
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <h2 className="eyebrow">{section.title}</h2>

              {section.note ? (
                <p className="text-body-sm text-muted-foreground">{section.note}</p>
              ) : null}

              {section.insights.length > 0 ? (
                <ul className="space-y-2.5">
                  {section.insights.map((insight) => (
                    <li
                      key={insight.id}
                      // A left rule in the theme's lavender, rather than a full
                      // box per line: at a dozen insights, twelve bordered
                      // cards read as a list of alerts.
                      className="border-lavender-deep bg-card space-y-1 rounded-r-lg border-l-4 py-3 pr-4 pl-4 shadow-card"
                    >
                      <p className="text-body-sm text-pretty">{insight.statement}</p>
                      {insight.basis ? (
                        <p className="text-caption text-muted-foreground">
                          {insight.basis}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
