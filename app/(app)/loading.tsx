import { Skeleton } from "@/components/ui/skeleton";

/**
 * The loading state for every screen in the app group.
 *
 * All of these pages read from MongoDB on the server, so a navigation used to
 * hold on the previous screen with nothing to say it had been registered. This
 * gives the shape of the page that is arriving - a heading, a summary block and
 * a list - rather than a spinner.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-32 w-full rounded-xl" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
