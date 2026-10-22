import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSearchResultsSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-5" aria-label="Loading Build search results">
      {["Projects", "Managed products", "Tickets"].map((section) => (
        <section key={section} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
