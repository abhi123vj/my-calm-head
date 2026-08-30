import { cva, type VariantProps } from "class-variance-authority";

import { avatarUrl, profileInitials, profileName } from "@/types/profile";
import type { Profile } from "@/types/profile";
import { cn } from "@/lib/utils";

/**
 * The account holder's picture, or their initials when there is none.
 *
 * A plain `img` rather than `next/image` on purpose: the avatar route is behind
 * the session cookie, and the image optimiser fetches from the server without
 * one, so an optimised request would come back 401. The image is already a
 * 512px square by the time it is stored, so there is nothing left to optimise.
 */
const avatarVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-lavender-strong font-medium text-primary-strong select-none",
  {
    variants: {
      size: {
        sm: "size-9 text-caption",
        md: "size-12 text-body",
        lg: "size-24 text-title",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

export function ProfileAvatar({
  profile,
  size,
  className,
  /**
   * A staged, not-yet-saved picture. When set it wins over the stored one, so
   * the preview and the saved avatar are the same component rather than two
   * that can drift apart.
   */
  previewUrl,
}: {
  profile: Profile;
  className?: string;
  previewUrl?: string | null;
} & VariantProps<typeof avatarVariants>) {
  // `undefined` means nothing is staged, so the stored picture shows;
  // `null` means a removal is staged and the circle must go empty. `??`
  // would treat those two as the same thing.
  const source = previewUrl !== undefined ? previewUrl : avatarUrl(profile);

  return (
    <span
      data-slot="profile-avatar"
      className={cn(avatarVariants({ size }), className)}
    >
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt={`${profileName(profile)}'s profile picture`}
          className="size-full object-cover"
        />
      ) : (
        // The initials are decorative: whatever labels this avatar - the header
        // link, the page heading - already carries the name in text.
        <span aria-hidden>{profileInitials(profile)}</span>
      )}
    </span>
  );
}
