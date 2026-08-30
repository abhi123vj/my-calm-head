import { sniffImageType } from "@/lib/profile/image-type";
import { checkAvatarFile } from "@/lib/validation/profile";

/**
 * What a submitted profile form says about the picture.
 *
 * Separate from the Server Function that applies it: this is the part that
 * interprets untrusted input, and keeping it out of the `"use server"` module
 * means it can be exercised directly, without a request around it. The action
 * keeps authorization, ordering, and revalidation.
 */
export type PictureOutcome =
  | { action: "keep" }
  | { action: "remove" }
  | { action: "replace"; bytes: Uint8Array; contentType: string }
  | { error: string };

/**
 * An empty file input means "leave it alone" rather than "remove it": browsers
 * submit a zero-byte entry for an untouched picker, and treating that as a
 * removal would wipe the photo every time the name was edited.
 */
export async function readPictureFromForm(
  formData: FormData,
): Promise<PictureOutcome> {
  const uploaded = formData.get("avatar");
  const hasUpload = uploaded instanceof File && uploaded.size > 0;

  if (!hasUpload) {
    return formData.get("removeAvatar") === "true"
      ? { action: "remove" }
      : { action: "keep" };
  }

  // Type and size first, from the metadata, so an oversized file is refused
  // without pulling it into memory.
  const declaredProblem = checkAvatarFile(uploaded);
  if (declaredProblem) return { error: declaredProblem };

  const bytes = new Uint8Array(await uploaded.arrayBuffer());

  // The declared type got the file this far; the bytes decide what is stored.
  // A file claiming to be a PNG while carrying markup is the classic way an
  // upload feature turns into stored XSS, and this is where that stops.
  const actualType = sniffImageType(bytes);
  if (!actualType) {
    return { error: "That file is not a JPEG, PNG, WebP or GIF image." };
  }

  return { action: "replace", bytes, contentType: actualType };
}
