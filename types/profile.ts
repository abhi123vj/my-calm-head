/**
 * The account holder's profile.
 *
 * This app has exactly one account, whose credentials live in the environment,
 * so a profile is not an identity — it is the presentation of one. The username
 * stays the login handle and is never editable; the display name and the avatar
 * are the parts the owner controls.
 *
 * The avatar bytes are deliberately absent: they are served by their own route
 * rather than embedded, so a page render never carries an image payload through
 * the RSC stream.
 */
export type Profile = {
  /** The login handle. Identifies the profile; not user-editable. */
  username: string;
  /** What the owner chose to be called, or `null` when never set. */
  displayName: string | null;
  avatar: ProfileAvatarMeta | null;
};

export type ProfileAvatarMeta = {
  /** An image mime type, e.g. `"image/webp"`. */
  contentType: string;
  /** Size of the stored bytes. */
  size: number;
  /**
   * ISO instant of the last upload. Doubles as the cache key in the avatar
   * URL, which is what makes a newly uploaded picture appear immediately
   * instead of behind a stale browser cache entry.
   */
  updatedAt: string;
};

/** The stored bytes plus what is needed to serve them. */
export type ProfileAvatar = ProfileAvatarMeta & {
  /**
   * Pinned to an `ArrayBuffer` backing rather than the default
   * `ArrayBufferLike`, which also covers `SharedArrayBuffer` and so cannot be
   * handed to a `Response` as a body.
   */
  data: Uint8Array<ArrayBuffer>;
};

/** What to call the account holder: their chosen name, else their handle. */
export function profileName(profile: Profile): string {
  return profile.displayName ?? profile.username;
}

/**
 * Up to two letters for the fallback avatar. Word initials where there are
 * words to take them from ("Ada Lovelace" -> "AL"), otherwise the first two
 * characters, so a single-word name still fills the circle.
 */
export function profileInitials(profile: Profile): string {
  const name = profileName(profile).trim();
  if (name.length === 0) return "?";

  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0][0]}${words[words.length - 1][0]}`
      : name.slice(0, 2);

  return initials.toUpperCase();
}

/**
 * Where to fetch the avatar, or `null` when there is nothing to fetch.
 *
 * The upload timestamp rides along as `v` so the URL changes whenever the
 * picture does. That is what lets the route cache aggressively while a new
 * photo still appears the moment it is saved.
 */
export function avatarUrl(profile: Profile): string | null {
  if (!profile.avatar) return null;
  return `/api/profile/avatar?v=${encodeURIComponent(profile.avatar.updatedAt)}`;
}
