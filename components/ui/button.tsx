import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Sizes are set from the touch target up rather than from the desktop down.
 * `default` is 44px, the smallest comfortable tap target on a phone, and every
 * other size stays at or above 32px for controls that sit inside dense rows.
 *
 * The focus ring comes from the global `:focus-visible` rule so a button, a
 * link and a chip all show the same indicator.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-card hover:bg-primary-strong hover:shadow-raised",
        secondary:
          "bg-lavender text-primary-strong hover:bg-lavender-strong aria-expanded:bg-lavender-strong",
        outline:
          "border-border bg-card text-foreground hover:border-lavender-deep hover:bg-lavender/60 aria-expanded:border-lavender-deep aria-expanded:bg-lavender/60",
        ghost:
          "text-muted-foreground hover:bg-lavender/70 hover:text-primary-strong aria-expanded:bg-lavender/70 aria-expanded:text-primary-strong",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)]",
        "destructive-soft":
          "bg-danger-soft text-destructive hover:bg-[color-mix(in_oklch,var(--danger-soft),var(--danger)_18%)]",
        link: "text-primary-strong underline decoration-lavender-deep underline-offset-4 hover:decoration-current",
      },
      size: {
        default: "h-11 px-4 text-body",
        xs: "h-8 gap-1 rounded-md px-2.5 text-caption [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 px-3.5 text-body-sm",
        lg: "h-12 px-5 text-body",
        icon: "size-11",
        "icon-xs": "size-8 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
