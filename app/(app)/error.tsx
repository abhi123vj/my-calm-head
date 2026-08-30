"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The fallback for an uncaught exception anywhere in the app group - most
 * plausibly a database read failing.
 *
 * It stays inside the layout, so the header and the tab bar are still there and
 * the other sections are one tap away rather than the whole screen being lost.
 * The message deliberately says nothing about the cause: `error.digest` is the
 * server-side handle for that.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description="This screen could not be loaded. Your records are unaffected — trying again usually resolves it."
      action={
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
      }
    />
  );
}
