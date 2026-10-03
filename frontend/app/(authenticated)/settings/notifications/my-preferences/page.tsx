import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { NotificationPreferencesPage } from "@/features/notifications/preferences-page";
import { prefetchMyNotificationPreferences } from "@/lib/prefetch/settings-notifications";

export default async function Page() {
  await enforceRouteAccess("/settings/notifications/my-preferences");
  const state = await prefetchMyNotificationPreferences();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <NotificationPreferencesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
