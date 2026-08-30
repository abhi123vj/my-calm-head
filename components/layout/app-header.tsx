import Link from "next/link";

import { CalmMark, CalmWordmark } from "@/components/layout/calm-mark";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { profileName, type Profile } from "@/types/profile";

/**
 * The top bar.
 *
 * On a phone and a tablet it carries identity only - the sections themselves
 * live in the bottom tab bar, within thumb reach. From `lg` up the navigation
 * moves in here and the bar becomes the single place to orient yourself.
 *
 * It is sticky rather than static so the way out of a long history or a long
 * wizard is always one tap away.
 *
 * The account block is the one part that is the same at every width: the avatar
 * is where the profile lives, and on a phone it is the only entry point to it,
 * since the tab bar has no room for a sixth destination. It stands alone, with
 * the name carried by its accessible label rather than set beside it - there is
 * one account here, and the picture already says whose it is.
 *
 * Signing out sits on the profile page the avatar leads to, rather than in a
 * bar that is on screen for the whole session - a persistent one-tap way to end
 * the session is a mis-tap waiting to happen, and it is not an action anyone
 * needs within reach at all times.
 */
export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="border-border bg-card/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-16">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 shrink-0 items-center gap-1.5 rounded-lg"
        >
          {/* The mark carries its own optical margin, so the gap here is
              tighter than it looks - the lotus is inset within its box. */}
          <CalmMark className="size-9 shrink-0" />
          <CalmWordmark className="text-subheading truncate" />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-4">
          <DesktopNav />

          {/* The rule only appears once the nav sits in the bar beside it -
              on a phone there is nothing on the left of the account block to
              separate it from. */}
          <div className="border-border lg:border-l lg:pl-4">
            {/* Nothing visible labels the avatar, so the name is what the
                accessible name is built from: "Your profile" alone would not
                say whose. The hit area is the full 44px square even though the
                picture inside it is 36px. */}
            <Link
              href="/profile"
              aria-label={`Your profile, ${profileName(profile)}`}
              className="hover:bg-lavender/70 flex size-11 items-center justify-center rounded-full transition-colors"
            >
              <ProfileAvatar profile={profile} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
