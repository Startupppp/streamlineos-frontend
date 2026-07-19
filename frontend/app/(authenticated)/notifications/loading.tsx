import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";

export default function NotificationsLoading() {
  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        <NotificationListSkeleton count={12} />
      </div>
    </PageWrapper>
  );
}
