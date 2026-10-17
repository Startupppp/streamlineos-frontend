import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NotificationPolicyPage } from "@/features/notifications/admin/notification-policy-page";
import { prefetchNotificationPolicy } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await requirePermission("notifications:policy:view");
  const state = await prefetchNotificationPolicy();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <NotificationPolicyPage />
      </HydrationBoundary>
    </Suspense>
  );
}
