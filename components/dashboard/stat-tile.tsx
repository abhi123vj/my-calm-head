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
 */
export function StatTile({
  label,
  value,
  note,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  note?: string;
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
      {note ? (
        <p className="text-caption text-muted-foreground mt-0.5 text-pretty">{note}</p>
      ) : null}
    </div>
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
