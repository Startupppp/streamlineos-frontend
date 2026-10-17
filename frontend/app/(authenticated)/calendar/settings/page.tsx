import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarAdminSettings } from "@/features/calendar/calendar-admin-settings";

export const metadata: Metadata = { title: "Calendar Settings | StreamlineOS" };

export default async function CalendarSettingsPage() {
  await enforceRouteAccess("/calendar/settings");
  return (
    <PageWrapper title="Calendar Settings" subtitle="Governance, trustworthy analytics, automation, and developer access">
      <CalendarAdminSettings />
    </PageWrapper>
  );
}
