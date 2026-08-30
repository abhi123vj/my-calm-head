import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/dal";
import { listMigraines } from "@/lib/migraines/repository";
import { buildInsights } from "@/lib/migraines/insights";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  await requireSession();

  const episodes = await listMigraines({ sort: "oldest" });
  const sections = buildInsights(episodes);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-muted-foreground text-sm">
          Descriptions of what you have recorded.
        </p>
      </div>

      {/* Stated once, up front, rather than repeated as a caveat on every line.
          The statements themselves are worded so they cannot be read as claims
          about cause. */}
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">These describe your records only</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Everything below is counted from what you entered. A trigger listed
          here was recorded alongside an episode &mdash; that is not evidence it
          caused one. Nothing here is a diagnosis or medical advice.
        </p>
      </div>

      {episodes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nothing to describe yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Insights appear once you have logged some episodes.
          </p>
          <Link href="/log" className={`${buttonVariants()} mt-4`}>
            Log your first episode
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {section.title}
              </h2>

              {section.note ? (
                <p className="text-muted-foreground text-sm">{section.note}</p>
              ) : null}

              {section.insights.length > 0 ? (
                <ul className="space-y-3">
                  {section.insights.map((insight) => (
                    <li key={insight.id} className="rounded-lg border p-3">
                      <p className="text-sm">{insight.statement}</p>
                      {insight.basis ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
