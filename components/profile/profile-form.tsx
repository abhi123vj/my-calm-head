"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { AvatarPicker } from "@/components/profile/avatar-picker";
import { updateProfile, type ProfileFormState } from "@/lib/actions/profile";
import { MAX_DISPLAY_NAME_LENGTH } from "@/lib/validation/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/profile";

/**
 * Lives here rather than beside the action: a "use server" module may only
 * export async functions, and this is the form's starting state in any case.
 */
const initialState: ProfileFormState = { status: "idle" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [preparing, setPreparing] = useState(false);

  const busy = pending || preparing;

  return (
    <form action={formAction} className="space-y-6">
      {/* Remounted after every successful save, which is what discards the
          staged photo and empties the file input: once the picture is stored,
          `profile` is the truth again and re-submitting the same bytes would
          be a second upload. A failed save keeps the key, so a rejected pick
          survives for the retry. */}
      <AvatarPicker
        key={state.savedAt ?? "initial"}
        profile={profile}
        serverError={state.fieldErrors?.avatar}
        disabled={pending}
        onPreparingChange={setPreparing}
      />

      <Field
        label="Display name"
        htmlFor="displayName"
        hint={`Shown in the header and on this page. Leave it empty to go back to ${profile.username}.`}
        error={state.fieldErrors?.displayName}
      >
        {/* Keyed on the stored name so that the key and `defaultValue` come
            from the same source and can only change together. Saving
            revalidates the layout, which hands this component a new `profile`;
            without the key that would move an uncontrolled input's default
            after it had mounted, which Base UI warns about and which would
            leave the field disagreeing with what was actually stored. The
            remount also re-seeds the field with the normalised name, so
            trailing spaces the server trimmed do not linger on screen. */}
        <Input
          key={profile.displayName ?? ""}
          id="displayName"
          name="displayName"
          defaultValue={profile.displayName ?? ""}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          autoComplete="name"
          placeholder={profile.username}
          aria-invalid={state.fieldErrors?.displayName ? true : undefined}
          aria-describedby="displayName-hint"
        />
      </Field>

      {/* `aria-live` matters here: the result arrives after submit without a
          navigation, so nothing else would announce it. */}
      {state.message ? (
        <Alert
          variant={state.status === "success" ? "success" : "destructive"}
          aria-live="polite"
        >
          {state.status === "success" ? (
            <CircleCheck aria-hidden />
          ) : (
            <CircleAlert aria-hidden />
          )}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
