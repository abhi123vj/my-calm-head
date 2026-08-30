import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The theme adds semantic font sizes (`text-body`, `text-title`, ...) on top of
 * Tailwind's numeric scale. tailwind-merge has to be told about them:
 * out of the box it only recognises the built-in sizes, so `text-body` falls
 * through to its `text-color` group and then silently wins over a real colour
 * in the same `cn()` call.
 *
 * That is not theoretical - it stripped `text-primary-foreground` from every
 * primary button, which rendered ink-on-indigo at 2.8:1 instead of white.
 */
const TYPE_SCALE = [
  "display",
  "title",
  "heading",
  "subheading",
  "body",
  "body-sm",
  "caption",
  "label",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_SCALE] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
