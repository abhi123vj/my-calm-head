import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "hover:border-border-strong focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted",
        "aria-invalid:border-destructive aria-invalid:bg-danger-soft",
        "md:text-body",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
