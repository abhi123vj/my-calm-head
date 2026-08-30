"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, ImageUp, Trash2 } from "lucide-react";

import { AvatarCropper } from "@/components/profile/avatar-cropper";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import {
  loadAvatarSource,
  renderAvatar,
  type AvatarSource,
  type CropRect,
} from "@/lib/profile/image";
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
 *
 * `file` is the encoded square that was put into the file input, kept so that a
 * cancelled second pick can put the first one back - by then the input holds
 * the raw new file and the staged preview would otherwise be describing bytes
 * that are no longer there.
 */
type StagedPicture =
  | { kind: "unchanged" }
  | { kind: "replace"; file: File; previewUrl: string }
  | { kind: "remove" };

/**
 * The picture half of the profile form: preview, picker, cropper, and the flag
 * that asks for a removal.
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
  /** Lets the form hold its Save button while a picture is being chosen. */
  onPreparingChange: (preparing: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedPicture>({ kind: "unchanged" });
  const [source, setSource] = useState<AvatarSource | null>(null);
  // Paired with `source` rather than kept on `staged`, because it only means
  // anything against the photo it was measured on: a second pick has to open
  // the cropper fresh, not inherit the last photo's framing.
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
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

  // The decoded photo outlives the cropper, so it can be reopened for a second
  // adjustment without decoding again. Freeing it is tied to the state the same
  // way, which covers both a replacement pick and the remount after a save.
  useEffect(() => {
    if (!source) return;
    return () => source.release();
  }, [source]);

  // Until the cropper closes there is nothing prepared in the input to submit,
  // so choosing a photo holds the Save button just as encoding one does.
  useEffect(() => {
    onPreparingChange(preparing || cropOpen);
  }, [preparing, cropOpen, onPreparingChange]);

  function emptyPicker() {
    if (fileInput.current) fileInput.current.value = "";
  }

  function clearPicker() {
    emptyPicker();
    setStaged({ kind: "unchanged" });
  }

  function forgetSource() {
    setSource(null);
    setCrop(null);
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

    setPreparing(true);
    try {
      // Decoded up front rather than inside the cropper, so a file that is not
      // really an image is refused here instead of opening an empty dialog.
      const loaded = await loadAvatarSource(file);
      setSource(loaded);
      setCrop(null);
      setCropOpen(true);
    } catch {
      setPickError("That image could not be opened. Try a different one.");
      clearPicker();
      forgetSource();
    } finally {
      setPreparing(false);
    }
  }

  async function handleCrop(chosen: CropRect) {
    if (!source) return;
    setCropOpen(false);
    setPreparing(true);

    try {
      const prepared = await renderAvatar(source, chosen);

      const problem = checkAvatarFile(prepared);
      if (problem) {
        setPickError(problem);
        clearPicker();
        forgetSource();
        return;
      }

      // The cropped file replaces the original in the picker, so the form
      // submits the small square rather than the photo that was picked.
      putInPicker(prepared);
      setCrop(chosen);
      setStaged({
        kind: "replace",
        file: prepared,
        previewUrl: URL.createObjectURL(prepared),
      });
    } catch {
      setPickError("That image could not be prepared. Try a different one.");
      clearPicker();
      forgetSource();
    } finally {
      setPreparing(false);
    }
  }

  function handleCropClose() {
    setCropOpen(false);

    // Cancelling an adjustment leaves the staged photo exactly as it was, which
    // means putting it back: picking a second file has already replaced the
    // input's contents with the raw pick by this point.
    if (staged.kind === "replace") {
      putInPicker(staged.file);
      return;
    }

    emptyPicker();
  }

  const error = pickError ?? serverError;
  const busy = disabled || preparing;

  // `crop` is what ties the loaded photo to the staged one: it is set when a
  // crop is accepted and cleared by the next pick, so a second pick that was
  // cancelled - which leaves the first photo staged but the second one loaded -
  // correctly offers nothing to adjust.
  const canAdjust = staged.kind === "replace" && source !== null && crop !== null;

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

          {canAdjust ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setCropOpen(true)}
            >
              <Crop aria-hidden />
              Adjust
            </Button>
          ) : null}

          {profile.avatar && staged.kind !== "remove" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                clearPicker();
                forgetSource();
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
                forgetSource();
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
          JPEG, PNG, WebP or GIF. You choose the square that is kept, and it is
          scaled to {AVATAR_DIMENSION}px on this device before it is uploaded.
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

      <AvatarCropper
        source={source}
        initialCrop={crop ?? undefined}
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) handleCropClose();
        }}
        onConfirm={(crop) => void handleCrop(crop)}
      />
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
