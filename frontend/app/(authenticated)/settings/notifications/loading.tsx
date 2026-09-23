import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SettingsNotificationsLoading() {
  return (
    <PageWrapper title="Notification Settings">
      <div className="flex flex-1 flex-col gap-6">
        <div className="rounded-lg border border-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0 bg-card"
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
