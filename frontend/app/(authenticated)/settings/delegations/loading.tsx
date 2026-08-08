import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function DelegationsLoading() {
  return (
    <PageWrapper
      title="Delegations"
      subtitle="Share specific permissions with teammates for a set period."
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
      filtersClassName="flex-col items-stretch gap-2 overflow-visible md:flex-row md:items-center md:justify-between"
      filters={
        <>
          <div className="flex h-9 w-full items-center gap-1 rounded-md border border-border bg-card px-1 md:w-[240px]">
            <Skeleton className="h-5 w-16 rounded-sm" />
            <Skeleton className="h-5 w-16 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-full rounded-md md:max-w-xs" />
        </>
      }
    >
      <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
