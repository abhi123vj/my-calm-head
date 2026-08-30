import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SeverityMark } from "@/components/migraines/severity-mark";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * One episode in a list.
 *
 * The dashboard's recent list and the calendar's day panel both rendered this
 * by hand as a `flex-wrap` row of five spans, which on a phone broke into an
 * unreadable ragged block. Here the row is a fixed three-part layout - mark,
 * stacked text, chevron - so it holds its shape from 320px up, and the meta
 * facts wrap inside their own column instead of pushing the chevron away.
 */
export function EpisodeListItem({
  href,
  title,
  severity,
  meta,
  footnote,
  badges,
  className,
}: {
  href: string;
  title: string;
  severity: number | null;
  /** Short facts joined with a separator; empty entries are dropped. */
  meta?: (string | null | undefined)[];
  footnote?: string | null;
  badges?: React.ReactNode;
  className?: string;
}) {
  const facts = (meta ?? []).filter((fact): fact is string => Boolean(fact));

  return (
    <Link
      href={href}
      className={cn(
        "hover:bg-lavender/50 flex items-center gap-3 px-4 py-3 transition-colors",
        className,
      )}
    >
      <SeverityMark severity={severity} size="md" />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body-sm font-medium">{title}</span>
          {badges}
        </div>
        {facts.length > 0 ? (
          <p className="text-caption text-muted-foreground">
            {facts.join(" · ")}
          </p>
        ) : null}
        {footnote ? (
          <p className="text-caption text-muted-foreground line-clamp-2">{footnote}</p>
        ) : null}
      </div>

      <ChevronRight
        aria-hidden
        className="text-text-muted size-4 shrink-0"
      />
    </Link>
  );
}

/** Draft and ongoing markers, so the two are labelled the same way everywhere. */
export function EpisodeStatusBadges({
  status,
  ongoing,
}: {
  status: "draft" | "complete";
  ongoing: boolean;
}) {
  return (
    <>
      {status === "draft" ? <Badge variant="draft">Draft</Badge> : null}
      {ongoing ? <Badge variant="ongoing">Ongoing</Badge> : null}
    </>
  );
}
