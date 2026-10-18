import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationProvidersLoading() {
  return (
    <PageWrapper
      title="Notification Providers"
      subtitle="Configure delivery channels for email, SMS, and push"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-md" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
