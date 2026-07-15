import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BroadcastsLoading() {
  return (
    <PageWrapper title="Broadcast Center" subtitle="Send announcements and mass notifications to your team">
      <div className="border border-border rounded-lg divide-y divide-border">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full max-w-xs" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-7 w-14 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
