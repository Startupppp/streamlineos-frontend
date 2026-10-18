import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationTemplatesLoading() {
  return (
    <PageWrapper
      title="Notification Templates"
      subtitle="Manage message templates for email, SMS, and in-app notifications"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
