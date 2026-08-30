"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMigraine } from "@/lib/actions/migraines";
import { Button } from "@/components/ui/button";

/**
 * Two-click delete.
 *
 * Confirmation is inline rather than a `window.confirm` dialog: it cannot be
 * suppressed by the browser, it is readable on a phone, and it leaves the
 * cancel action as the easy one to hit.
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
      <div className="space-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          Delete
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Delete this episode permanently?</span>
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
  );
}
