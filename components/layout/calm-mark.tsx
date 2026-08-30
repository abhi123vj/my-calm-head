import { cn } from "@/lib/utils";

/**
 * The product mark: a profile crowned with a lotus.
 *
 * Drawn as paths rather than imported as a bitmap so it stays crisp at the
 * 36px the header uses and the 64px the sign-in screen uses, and so it can be
 * recoloured by the theme. Two tones, matching the identity: the outline takes
 * `currentColor` (the caller sets it, `text-primary-strong` by default) and the
 * petals and hair take the `fill` set on the root, so the pair inverts by
 * itself in dark mode - there `--primary-strong` is the light step and
 * `--lavender-deep` the dark one.
 *
 * `className` wins over both defaults, so a caller can retint the mark without
 * reaching into the paths.
 */
export function CalmMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("fill-lavender-deep text-primary-strong size-9", className)}
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Profile: forehead, nose, lips, chin, then the jaw running back under
            the hair, which is painted after it and hides the loose end. */}
        <path
          fill="none"
          d="M31,20 C36.2,20.4 41,23.2 43.8,27.5 C45.5,29.3 46.4,30.7 46.4,32 C46.4,33.3 45.6,33.7 44.8,34.2 C45.6,35.4 46.3,36.6 47,38 C48.2,40 50.4,41.3 50.4,42.2 C50.4,43.2 47.6,43.8 45.8,43.9 C47.3,44.7 47.6,45.4 47.3,46.2 C47,46.9 46.3,47.3 45.4,47.5 C46.4,48.5 46.8,49.8 46.7,51.2 C46.5,53 43.6,54.4 40,54.7 C35.6,55.1 31,54 27,51.4"
        />
        <path fill="none" d="M37.4,33.8 C39.2,35.9 41.4,36.2 42.8,35" />
        <path d="M32,20 C22.5,20.6 16.6,26.6 15.4,35.4 C14.4,43.8 16.6,51 21.4,56.2 C24.6,59.4 28.8,61 33,60.6 C30.6,58.2 28.8,55.2 27.6,51.4 C25.6,46 25,39.6 25.8,32.8 C26.5,26.6 28.6,22.2 32,20 Z" />

        {/* Lotus. One petal outline, rotated about the base it shares at
            (31, 26), so the fan stays symmetrical; the two unfilled copies are
            the inner layer. */}
        <path
          d="M31,26 C24.4,18.7 24.9,12.4 31,8.5 C37.1,12.4 37.6,18.7 31,26 Z"
          transform="rotate(-73 31 26)"
        />
        <path
          d="M31,26 C24.4,18.7 24.9,12.4 31,8.5 C37.1,12.4 37.6,18.7 31,26 Z"
          transform="rotate(73 31 26)"
        />
        <path
          d="M31,26 C24.2,17.4 24.7,10 31,5.5 C37.3,10 37.8,17.4 31,26 Z"
          transform="rotate(-37 31 26)"
        />
        <path
          d="M31,26 C24.2,17.4 24.7,10 31,5.5 C37.3,10 37.8,17.4 31,26 Z"
          transform="rotate(37 31 26)"
        />
        <path d="M31,26 C24,16.3 24.6,8.1 31,3 C37.4,8.1 38,16.3 31,26 Z" />
        <path
          fill="none"
          d="M31,26 C26.2,19.7 26.6,14.3 31,11 C35.4,14.3 35.8,19.7 31,26 Z"
          transform="rotate(-19 31 26)"
        />
        <path
          fill="none"
          d="M31,26 C26.2,19.7 26.6,14.3 31,11 C35.4,14.3 35.8,19.7 31,26 Z"
          transform="rotate(19 31 26)"
        />
      </g>
    </svg>
  );
}

/**
 * The wordmark, split the way the identity splits it: "My Calm" in ink,
 * "Head" a step lighter.
 *
 * The identity sets "Head" in the pale lavender, which is 1.9:1 on white - fine
 * for a printed lockup, not for a name a reader has to pick out of a toolbar.
 * `--primary` keeps the two-tone break and clears AA at 5.4:1.
 *
 * The two spans sit inside one element with no whitespace between them beyond
 * the space itself, so it is still read and copied as "My Calm Head".
 */
export function CalmWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-foreground", className)}>
      My Calm <span className="text-primary">Head</span>
    </span>
  );
}
