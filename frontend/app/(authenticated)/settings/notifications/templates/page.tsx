import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NotificationTemplatesPage } from "@/features/notifications/admin/notification-templates-page";
import { prefetchNotificationTemplates } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await requirePermission("notifications:templates:view");
  const state = await prefetchNotificationTemplates();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <NotificationTemplatesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
