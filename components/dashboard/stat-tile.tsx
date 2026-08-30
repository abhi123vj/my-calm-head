import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A single headline figure.
 *
 * `note` is where a figure states what it excluded - how many episodes had no
 * severity recorded, whether an average blends estimates - so a number is never
 * shown more confidently than the data behind it.
 *
 * `tone="feature"` is the lavender treatment for the one figure a screen leads
 * with. Eight identically weighted tiles read as a wall of boxes; one featured
 * figure with the rest quiet reads as a summary.
 *
 * `trend` adds a direction to a figure that has moved. It is deliberately drawn
 * in the muted text colour with no red or green: fewer episodes than last month
 * is not a success the app is entitled to congratulate anyone for, and more of
 * them is not a failure. The arrow says which way the number went, and the
 * wording says what it was measured against.
 */
export function StatTile({
  label,
  value,
  note,
  trend,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  note?: string;
  trend?: Trend;
  tone?: "default" | "feature";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border p-4 transition-shadow",
        tone === "feature"
          ? "border-lavender-deep/50 from-lavender/70 to-card bg-gradient-to-br"
          : "border-border bg-card shadow-card",
        className,
      )}
    >
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "text-foreground tabular-nums",
          // A "most recorded symptom" tile holds a word, not a number, so the
          // figure wraps rather than being clipped or forcing a scrollbar.
          "text-title leading-tight text-balance",
          tone === "feature" && "text-primary-strong",
        )}
      >
        {value}
      </p>
      {trend ? <TrendNote trend={trend} /> : null}
      {note ? (
        <p className="text-caption text-muted-foreground mt-0.5 text-pretty">{note}</p>
      ) : null}
    </div>
  );
}

export type Trend = {
  direction: "up" | "down" | "level";
  /** Names what the figure moved against, e.g. "1 more than the 30 days before". */
  label: string;
};

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  level: Minus,
} as const;

function TrendNote({ trend }: { trend: Trend }) {
  const Icon = TREND_ICONS[trend.direction];
  return (
    <p className="text-caption text-muted-foreground mt-0.5 flex items-center gap-1.5 text-pretty">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {trend.label}
    </p>
  );
}

/**
 * The compact figure used inside a grouped summary card, where the label and
 * value share one small column rather than each getting a tile of its own.
 */
export function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-heading text-foreground tabular-nums">{value}</p>
      <p className="text-caption text-muted-foreground truncate">{label}</p>
      {note ? (
        <p className="text-caption text-muted-foreground truncate">{note}</p>
      ) : null}
    </div>
  );
}
