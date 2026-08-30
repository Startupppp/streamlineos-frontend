import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Calendar Settings | StreamlineOS" };

export default async function CalendarSettingsPage() {
  await enforceRouteAccess("/calendar/settings");
  return (
    <PageWrapper title="Calendar Settings" subtitle="Organisation-wide calendar configuration and source integrations">
      <EmptyState
        title="Calendar settings"
        description="Organisation-wide calendar configuration and source integration management are shown here. Full settings UI is coming soon."
        className="flex-1"
      />
    </PageWrapper>
  );
}
