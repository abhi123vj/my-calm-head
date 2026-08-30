"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The submit button of the sign-out form.
 *
 * A client component only so it can read `useFormStatus`, which has to be
 * called from inside the form it reports on. The form itself, and the action it
 * posts to, stay on the server.
 *
 * Signing out ends with a redirect, so the pending state covers the whole gap
 * between the tap and the login screen appearing - without it the bar sits
 * unchanged for that beat and invites a second tap.
 */
export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      <LogOut aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
