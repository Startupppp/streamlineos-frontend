import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function NotificationEventsLoading() {
  return (
    <PageWrapper
      title="Event Catalog"
      subtitle="View and configure per-event notification policy for your organization"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 min-w-0 flex-1" />
          <Skeleton className="h-9 w-44 shrink-0" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
