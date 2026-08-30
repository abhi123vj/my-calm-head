import Link from "next/link";
import { SearchX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown when `notFound()` is called inside the app group - in practice, opening
 * an episode id that no longer exists, usually after deleting it in another
 * tab. Rendered inside the layout so the navigation survives the 404.
 */
export default function AppNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      description="This episode does not exist, or it has been deleted."
      action={
        <Link href="/history" className={buttonVariants({ variant: "secondary" })}>
          Back to history
        </Link>
      }
    />
  );
}
