import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NotificationProvidersPage } from "@/features/notifications/admin/notification-providers-page";
import { prefetchNotificationProviders } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await requirePermission("notifications:providers:view");
  const state = await prefetchNotificationProviders();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <NotificationProvidersPage />
      </HydrationBoundary>
    </Suspense>
  );
}
