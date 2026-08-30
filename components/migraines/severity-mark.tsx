import { severityBand } from "@/lib/migraines/severity-scale";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 rounded-lg text-body-sm",
  md: "size-10 rounded-lg text-body",
  lg: "size-14 rounded-2xl text-heading",
} as const;

/**
 * The tinted severity square.
 *
 * It appeared as hand-rolled inline styles in the dashboard, the calendar grid
 * and the day panel, each with its own size and radius. The number is always
 * printed inside it, so the tint is a scanning aid rather than the only way to
 * read the value.
 *
 * Marked `aria-hidden` because every place it is used also states the severity
 * in text - announcing it twice would be noise.
 */
export function SeverityMark({
  severity,
  size = "md",
  className,
}: {
  severity: number | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const band = severityBand(severity);

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold tabular-nums",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: band.background, color: band.foreground }}
    >
      {severity ?? "–"}
    </span>
  );
}
