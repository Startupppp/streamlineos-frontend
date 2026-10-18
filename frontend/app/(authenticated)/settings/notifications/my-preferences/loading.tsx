import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationMyPreferencesLoading() {
  return (
    <PageWrapper
      title="Notification Preferences"
      subtitle="Control how and when you receive notifications"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-28" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <Skeleton className="h-5 w-20" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border px-3 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
