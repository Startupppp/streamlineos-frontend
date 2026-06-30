import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationPreferencesLoading() {
  return (
    <PageWrapper title="Notification Preferences" subtitle="Control how and when you receive notifications">
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded" />
          <div className="border border-border rounded-lg divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-3 gap-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
                <Skeleton className="h-5 w-9 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
