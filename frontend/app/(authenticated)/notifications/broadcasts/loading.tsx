import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function BroadcastsLoading() {
  return (
    <PageWrapper
      title="Broadcast Center"
      subtitle="Send announcements and mass notifications to your team"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex gap-1 shrink-0 border-b border-border pb-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-t-md" />
          ))}
        </div>
        <div className="rounded-lg border border-border divide-y divide-border">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
