import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSearchResultsSkeleton } from "@/features/search/workspace-search-results-skeleton";

export default function BuildSearchLoading() {
  return (
    <PageWrapper
      title="Search Build"
      subtitle="Find the projects, managed products, and tickets you can access."
      contentClassName="py-1"
    >
      <div className="grid min-h-full w-full flex-1 grid-cols-1 content-start gap-5 lg:grid-cols-4">
        <main className="flex min-w-0 flex-col gap-5 lg:col-span-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <WorkspaceSearchResultsSkeleton />
        </main>
        <aside className="h-fit space-y-3 rounded-xl border bg-card/40 p-4 lg:sticky lg:top-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-md" />
        </aside>
      </div>
    </PageWrapper>
  );
}
