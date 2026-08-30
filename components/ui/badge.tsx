import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Read-only status and value pills: Draft, Ongoing, filter summaries, recorded
 * answers. Distinct from `Chip`, which is an interactive control - these are
 * never clickable, so they are deliberately smaller than a touch target.
 *
 * The text wraps rather than being held on one line. A badge often carries a
 * value the user typed themselves, and an answer longer than the screen was
 * running off the right edge of the episode page at 390px; `overflow-wrap`
 * covers the case where that answer is one unbroken word.
 */
const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-caption leading-snug [overflow-wrap:anywhere]",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-sunken text-muted-foreground",
        lavender: "border-transparent bg-lavender text-primary-strong",
        outline: "border-border bg-card text-muted-foreground",
        /** A custom, user-typed value rather than one from the catalogue. */
        custom: "border-lavender-deep border-dashed bg-card text-muted-foreground",
        ongoing: "border-primary/40 bg-primary-soft font-medium text-primary-strong",
        draft: "border-border-strong border-dashed bg-card text-muted-foreground",
        danger: "border-danger/40 bg-danger-soft text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
