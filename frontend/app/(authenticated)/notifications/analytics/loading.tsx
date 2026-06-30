import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationAnalyticsLoading() {
  return (
    <PageWrapper title="Notification Analytics" subtitle="Monitor delivery performance and engagement trends">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[6, 4].map((rows, ci) => (
            <div key={ci} className="border border-border rounded-lg p-3 space-y-3">
              <Skeleton className="h-3 w-20 rounded" />
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-2.5 w-8" />
                  </div>
                  <Skeleton className="h-2 rounded-full w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
