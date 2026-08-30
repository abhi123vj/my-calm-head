import { cn } from "@/lib/utils";

/**
 * Loading placeholder.
 *
 * Tinted lavender rather than grey so a loading screen still looks like this
 * app. The pulse is dropped under `prefers-reduced-motion` by the global rule
 * in `globals.css`.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-lavender/70", className)}
      {...props}
    />
  );
}
