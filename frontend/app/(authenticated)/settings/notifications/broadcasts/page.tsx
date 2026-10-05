import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { BroadcastsPage } from "@/features/notifications/admin/broadcasts-page";
import { prefetchNotificationBroadcasts } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await requirePermission("notifications:broadcasts:view");
  const state = await prefetchNotificationBroadcasts();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <BroadcastsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
