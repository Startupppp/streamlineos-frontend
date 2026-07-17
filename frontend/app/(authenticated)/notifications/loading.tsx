import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";

export default function NotificationsLoading() {
  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Skeleton className="h-9 w-48 rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      }
    >
      <NotificationListSkeleton count={12} />
    </PageWrapper>
  );
}
