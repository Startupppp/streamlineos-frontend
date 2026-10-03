import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NotificationEventsPage } from "@/features/notifications/admin/notification-events-page";
import { prefetchNotificationEvents } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await requirePermission("notifications:events:view");
  const state = await prefetchNotificationEvents();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <NotificationEventsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
