"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/dal";
import {
  clearAvatar,
  saveAvatar,
  saveDisplayName,
} from "@/lib/profile/repository";
import { readPictureFromForm } from "@/lib/profile/upload";
import { displayNameSchema } from "@/lib/validation/profile";

/**
 * Server Functions are reachable by direct POST, not only through the UI, so
 * the session is verified here and every value in the payload is re-checked -
 * including the image, which the browser has already shrunk and validated.
 */

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  /** Shown once, above the form, after a submit. */
  message?: string;
  fieldErrors?: {
    displayName?: string;
    avatar?: string;
  };
  /**
   * Set on every successful save, and never repeated. The form uses it as the
   * `key` for the picture controls, so a save that went through discards what
   * they were holding while a rejected one leaves it in place to be corrected.
   */
  savedAt?: string;
};

export async function updateProfile(
  previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { username } = await requireSession();

  const parsedName = displayNameSchema.safeParse(formData.get("displayName") ?? "");
  const picture = await readPictureFromForm(formData);

  // Validate everything before writing anything: a rejected picture must not
  // leave a half-applied save where the name changed and the photo did not.
  if (!parsedName.success || "error" in picture) {
    return {
      status: "error",
      message: "Nothing was saved. Check the highlighted fields.",
      // Carried forward unchanged: a rejected save must not look like a fresh
      // one to the form, or it would reset the very controls being corrected.
      savedAt: previousState.savedAt,
      fieldErrors: {
        displayName: parsedName.success
          ? undefined
          : parsedName.error.issues[0]?.message,
        avatar: "error" in picture ? picture.error : undefined,
      },
    };
  }

  await saveDisplayName(username, parsedName.data);

  let photoChanged = false;
  if (picture.action === "replace") {
    await saveAvatar(username, picture.bytes, picture.contentType);
    photoChanged = true;
  } else if (picture.action === "remove") {
    photoChanged = await clearAvatar(username);
  }

  // The header renders the name and the picture on every screen, so the whole
  // tree below the root layout has to be revalidated, not just this page.
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: photoChanged ? "Profile updated." : "Name updated.",
    savedAt: new Date().toISOString(),
  };
}
