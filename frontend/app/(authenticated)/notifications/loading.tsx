import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NotificationsLoading() {
  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Skeleton className="h-9 w-48 rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      }
    >
      <div className="space-y-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3.5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full max-w-xs" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
