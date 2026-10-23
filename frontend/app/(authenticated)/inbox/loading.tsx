import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationListSkeleton } from "@/features/notifications/notification-list-skeleton";

export default function InboxLoading() {
  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments and approvals waiting for your attention"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 w-20 max-w-full shrink-0 rounded-full sm:w-24"
            />
          ))}
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <NotificationListSkeleton count={10} />
      </div>
    </PageWrapper>
  );
}
