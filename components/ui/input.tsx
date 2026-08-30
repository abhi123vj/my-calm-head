import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * 44px tall on every viewport - a form control is the thing most often mistapped
 * on a phone, so it does not shrink on desktop the way a button might.
 *
 * The font size stays at 16px on small screens because iOS Safari zooms the
 * page when a focused input is smaller than that, which is the single most
 * common cause of a "the layout jumped" bug report on mobile.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base text-foreground transition-colors outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "hover:border-border-strong focus-visible:border-primary",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-muted",
        "aria-invalid:border-destructive aria-invalid:bg-danger-soft",
        "md:text-body",
        className
      )}
      {...props}
    />
  )
}

export { Input }
