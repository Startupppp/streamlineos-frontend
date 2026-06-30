import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationQueueLoading() {
  return (
    <PageWrapper title="Queue Monitor" subtitle="Monitor active delivery queue and retry failed notifications">
      <div className="border border-border rounded-lg divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full max-w-xs" />
            </div>
            <Skeleton className="h-7 w-14 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
