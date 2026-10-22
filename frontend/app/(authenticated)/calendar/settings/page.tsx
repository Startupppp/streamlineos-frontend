import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarAdminSettings } from "@/features/calendar/calendar-admin-settings";
import { prefetchCalendarAdminPolicy } from "@/lib/prefetch/calendar";
import CalendarSettingsLoading from "./loading";

export const metadata: Metadata = { title: "Calendar Settings" };

async function CalendarSettingsHydrated() {
  await enforceRouteAccess("/calendar/settings");
  const state = await prefetchCalendarAdminPolicy();
  return (
    <HydrationBoundary state={state}>
      <PageWrapper title="Calendar Settings" subtitle="Governance, trustworthy analytics, automation, and developer access">
        <CalendarAdminSettings />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={<CalendarSettingsLoading />}>
      <CalendarSettingsHydrated />
    </Suspense>
  );
}
