import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NotificationTemplatesLoading() {
  return (
    <PageWrapper
      title="Notification Templates"
      subtitle="Manage reusable templates for automated notifications"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="rounded-lg border border-border divide-y divide-border">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 font-mono" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
