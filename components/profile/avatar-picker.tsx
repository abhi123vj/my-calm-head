"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { shrinkAvatar } from "@/lib/profile/image";
import {
  AVATAR_DIMENSION,
  AVATAR_SOURCE_MAX_BYTES,
  checkAvatarFile,
  formatBytes,
} from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/profile";

/**
 * What the form is holding for the picture, as distinct from what is stored.
 * A photo is only written when the form is saved, so choosing one and then
 * navigating away changes nothing - the same way editing the name does.
 */
type StagedPicture =
  | { kind: "unchanged" }
  | { kind: "replace"; previewUrl: string }
  | { kind: "remove" };

/**
 * The picture half of the profile form: preview, picker, and the flag that
 * asks for a removal.
 *
 * Everything staged here is local and throwaway, which is why the form mounts
 * it under a `key` that changes on every successful save. Clearing this state
 * is then a remount rather than a pile of resets, and the file input goes back
 * to empty without being reached into.
 */
export function AvatarPicker({
  profile,
  serverError,
  disabled,
  onPreparingChange,
}: {
  profile: Profile;
  /** A rejection from the last save, which outlives this component's resets. */
  serverError?: string;
  disabled: boolean;
  /** Lets the form hold its Save button while an image is being shrunk. */
  onPreparingChange: (preparing: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedPicture>({ kind: "unchanged" });
  const [preparing, setPreparing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Tied to `staged` rather than revoked by hand: the cleanup runs after the
  // render that stopped using the URL has committed, so the preview is never
  // pulled out from under an image that is still on screen.
  useEffect(() => {
    if (staged.kind !== "replace") return;
    const url = staged.previewUrl;
    return () => URL.revokeObjectURL(url);
  }, [staged]);

  function setPreparingState(value: boolean) {
    setPreparing(value);
    onPreparingChange(value);
  }

  function clearPicker() {
    if (fileInput.current) fileInput.current.value = "";
    setStaged({ kind: "unchanged" });
  }

  function putInPicker(file: File) {
    const input = fileInput.current;
    if (!input) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    } catch {
      // Unsupported: keep whatever was picked and let the server apply the
      // same limits to it.
    }
  }

  async function handlePick(file: File) {
    setPickError(null);

    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      // Checked before decoding: a 40MB file should be refused, not loaded
      // into a canvas first.
      setPickError(
        `That image is ${formatBytes(file.size)}. Pick one under ${formatBytes(AVATAR_SOURCE_MAX_BYTES)}.`,
      );
      clearPicker();
      return;
    }

    setPreparingState(true);
    try {
      const prepared = await shrinkAvatar(file);

      const problem = checkAvatarFile(prepared);
      if (problem) {
        setPickError(problem);
        clearPicker();
        return;
      }

      // The shrunken file replaces the original in the picker, so the form
      // submits the small version.
      putInPicker(prepared);
      setStaged({ kind: "replace", previewUrl: URL.createObjectURL(prepared) });
    } finally {
      setPreparingState(false);
    }
  }

  const error = pickError ?? serverError;
  const busy = disabled || preparing;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <ProfileAvatar
        profile={profile}
        size="lg"
        previewUrl={stagedPreview(staged)}
      />

      <div className="w-full space-y-2">
        {/* Visually hidden and driven by the buttons beside it: a bare file
            input cannot be styled to match the rest of the app, and its "no
            file chosen" text contradicts the preview once one is staged.
            `sr-only` clips it rather than removing it, so it is still a real
            input in the form. */}
        <input
          ref={fileInput}
          id="avatar"
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          aria-label="Profile picture"
          aria-describedby="avatar-hint"
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handlePick(file);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <ImageUp aria-hidden />
            {preparing
              ? "Preparing…"
              : profile.avatar || staged.kind === "replace"
                ? "Change photo"
                : "Choose photo"}
          </Button>

          {profile.avatar && staged.kind !== "remove" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                clearPicker();
                setPickError(null);
                setStaged({ kind: "remove" });
              }}
            >
              <Trash2 aria-hidden />
              Remove photo
            </Button>
          ) : null}

          {staged.kind !== "unchanged" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                clearPicker();
                setPickError(null);
              }}
            >
              Undo
            </Button>
          ) : null}
        </div>

        {/* Only submitted when a removal is staged. Its presence is the
            instruction, which keeps "no file and no flag" meaning "leave the
            picture alone" - the case that happens every time the name is
            edited on its own. */}
        {staged.kind === "remove" ? (
          <input type="hidden" name="removeAvatar" value="true" />
        ) : null}

        <p id="avatar-hint" className="text-caption text-muted-foreground">
          JPEG, PNG, WebP or GIF. Cropped to a square and scaled to{" "}
          {AVATAR_DIMENSION}px on this device before it is uploaded.
        </p>

        {error ? (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        ) : null}

        {staged.kind !== "unchanged" && !error ? (
          <p className="text-caption text-muted-foreground">
            {staged.kind === "remove"
              ? "Your photo will be removed when you save."
              : "Your new photo will be uploaded when you save."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `undefined` means "show whatever is stored"; `null` means "show nothing",
 * which is what a staged removal has to look like straight away or the button
 * appears to have done nothing.
 */
function stagedPreview(staged: StagedPicture): string | null | undefined {
  if (staged.kind === "replace") return staged.previewUrl;
  if (staged.kind === "remove") return null;
  return undefined;
}
