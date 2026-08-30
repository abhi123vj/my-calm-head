import { z } from "zod";

/**
 * Profile input rules, shared by the form and the Server Function.
 *
 * Nothing here imports `server-only`: the browser needs the same limits to
 * reject a file before spending time reading it, and duplicating the numbers in
 * two places is how the two ends drift apart.
 */

/** Longest edge of the stored square avatar, in pixels. */
export const AVATAR_DIMENSION = 512;

/**
 * What may be stored. The browser normalises almost every upload to one of
 * these before it is sent, so this is really the guard on the paths that skip
 * that step - a direct POST, or a browser whose canvas encode failed.
 */
export const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Ceiling on the stored bytes. A 512px avatar lands around 40KB, so this is
 * roomy for the unresized fallback path while staying far below both the
 * Server Function body limit and Mongo's 16MB document cap.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Ceiling on the file a person picks, before the browser shrinks it. Generous
 * enough for a photo straight off a phone, small enough that decoding one does
 * not lock up the tab.
 */
export const AVATAR_SOURCE_MAX_BYTES = 12 * 1024 * 1024;

export const MAX_DISPLAY_NAME_LENGTH = 60;

/** C0 controls and DEL, which are invisible in a text input. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/**
 * A display name, or `null`.
 *
 * Clearing the field is a real choice - it means "go back to my username" - so
 * an empty string is normalised to `null` rather than rejected. Control
 * characters are stripped first: they are invisible in the input but would
 * render as blanks or break the header layout.
 */
export const displayNameSchema = z
  .string()
  .max(MAX_DISPLAY_NAME_LENGTH, {
    error: `Keep your name to ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
  })
  .transform((value) => value.replace(CONTROL_CHARACTERS, "").trim())
  .transform((value) => (value.length === 0 ? null : value));

export const profileInputSchema = z.object({
  displayName: displayNameSchema,
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

/** Human-readable size, for error copy. */
export function formatBytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${Number(megabytes.toFixed(megabytes < 10 ? 1 : 0))}MB`
    : `${Math.round(bytes / 1024)}KB`;
}

/**
 * Validates a picked or processed image. Returns an error message, or `null`
 * when the file is acceptable.
 */
export function checkAvatarFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!(AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a JPEG, PNG, WebP or GIF image.";
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(AVATAR_MAX_BYTES)}.`;
  }
  return null;
}
