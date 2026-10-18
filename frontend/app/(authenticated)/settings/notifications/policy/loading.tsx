import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationPolicyLoading() {
  return (
    <PageWrapper
      title="Notification Policy"
      subtitle="Configure organization-wide notification delivery defaults"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-56" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
