import "server-only";
import { cache } from "react";
import { requireSession } from "@/lib/auth/dal";
import { getProfile } from "@/lib/profile/repository";
import { emptyProfile } from "@/models/profile";
import type { Profile } from "@/types/profile";

/**
 * The signed-in account's profile.
 *
 * Memoized with React `cache` so the layout's header and the profile page
 * share a single read per request rather than querying twice.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const session = await requireSession();
  return getProfile(session.username);
});

/**
 * The same profile, for the header.
 *
 * The header renders on every page in the app, so a database hiccup while
 * reading it would take down routes that do not otherwise need Mongo - and
 * because it is a layout, the failure would escape past `(app)/error.tsx` to
 * the framework's own error page. The chrome degrades to the username instead.
 * The profile page calls `getCurrentProfile` directly and still surfaces the
 * error, which is where it belongs.
 */
export async function getCurrentProfileForChrome(): Promise<Profile> {
  const session = await requireSession();
  try {
    return await getCurrentProfile();
  } catch (error) {
    console.warn("[profile] could not load profile for the header:", error);
    return emptyProfile(session.username);
  }
}
