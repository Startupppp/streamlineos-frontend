import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationBroadcastsLoading() {
  return (
    <PageWrapper
      title="Broadcast Center"
      subtitle="Send announcements and mass notifications to your team"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-card p-1">
          <Skeleton className="h-7 w-16 rounded-sm" />
          <Skeleton className="h-7 w-16 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-16 rounded-sm" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
