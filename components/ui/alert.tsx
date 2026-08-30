import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Alerts are tinted surfaces rather than plain cards, so an error is
 * distinguishable from ordinary content without relying on the icon alone.
 * `destructive` uses the muted-red tint with the darker red for text, which is
 * the pair that clears AA.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border px-3.5 py-3 text-left text-body-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-20 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-danger/40 bg-danger-soft text-destructive *:data-[slot=alert-description]:text-destructive",
        info: "border-lavender-deep/50 bg-lavender/60 text-primary-strong *:data-[slot=alert-description]:text-foreground",
        success:
          "border-success/30 bg-success-soft text-success *:data-[slot=alert-description]:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-subheading group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-body-sm text-pretty text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-3",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-2.5", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
