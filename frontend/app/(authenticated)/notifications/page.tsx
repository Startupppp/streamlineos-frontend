import { HydrationBoundary } from "@tanstack/react-query";
import { NotificationsInboxPage } from "@/features/notifications/inbox/notifications-inbox-page";
import { prefetchNotificationsInbox } from "@/lib/prefetch/notifications";

export default async function Page() {
  const dehydratedState = await prefetchNotificationsInbox().catch(() => undefined);
  return (
    <HydrationBoundary state={dehydratedState}>
      <NotificationsInboxPage />
    </HydrationBoundary>
  );
}
