import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CrmActivitiesLoading() {
  return (
    <PageWrapper
      title="Activities"
      subtitle="All CRM interactions and follow-ups across leads, deals, and contacts"
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-1 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 space-y-2"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-16 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
