"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";

import { removeMigraine } from "@/lib/actions/migraines";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Two-click delete.
 *
 * Confirmation is inline rather than a `window.confirm` dialog: it cannot be
 * suppressed by the browser, it is readable on a phone, and it leaves the
 * cancel action as the easy one to hit.
 *
 * The confirmation is a full-width block rather than a row of three items - at
 * 320px the question and both buttons wrapped into a shape where "Yes, delete"
 * could end up directly under the thumb.
 */
export function DeleteEpisode({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeMigraine(id);
      if (result.ok) {
        router.push("/history");
        router.refresh();
      } else {
        setError(result.errors.join(" "));
        setConfirming(false);
      }
    });
  };

  if (!confirming) {
    return (
      <div className="space-y-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden />
          Delete
        </Button>
        {error ? (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="w-full sm:min-w-80">
      <TriangleAlert aria-hidden />
      <AlertTitle>Delete this episode permanently?</AlertTitle>
      <AlertDescription>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={remove}
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
