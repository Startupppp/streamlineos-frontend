import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrmCalendarLoading() {
  return (
    <PageWrapper title="Calendar" subtitle="Meetings, calls and scheduled activities" noInternalScroll>
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 m-1 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="bg-card min-h-[100px] p-1.5 space-y-1">
                <Skeleton className="h-4 w-6 rounded" />
                <Skeleton className="h-5 w-full rounded-full" />
                {i % 5 === 0 && <Skeleton className="h-5 w-3/4 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
