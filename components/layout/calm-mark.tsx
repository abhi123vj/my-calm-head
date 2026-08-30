import { cn } from "@/lib/utils";

/**
 * The product mark: two settling ripples.
 *
 * Drawn rather than imported so it inherits `currentColor` and stays crisp at
 * the 20px the header uses and the 28px the sign-in screen uses.
 */
export function CalmMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      <path d="M3 9c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3" />
      <path d="M4.5 15c1.5 0 1.5-2.2 3-2.2s1.5 2.2 3 2.2 1.5-2.2 3-2.2 1.5 2.2 3 2.2" />
    </svg>
  );
}
