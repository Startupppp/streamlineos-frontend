"use client";

import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarAdminPolicy } from "@/hooks/api/calendar-admin";
import { CalendarAdminPolicyCard } from "./calendar-admin-policy-card";
import { CalendarAnalyticsCard } from "./calendar-analytics-card";
import { CalendarWorkflowSettings } from "./calendar-workflow-settings";
import { CalendarResourceAdminCard } from "./calendar-resource-admin-card";

export function CalendarAdminSettings() {
  const policy = useCalendarAdminPolicy();

  return (
    <div className="space-y-5">
      {policy.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {policy.isError ? <ErrorState title="Calendar governance could not be loaded" onRetry={() => void policy.refetch()} /> : null}
      {policy.data ? <CalendarAdminPolicyCard policy={policy.data} /> : null}
      <CalendarResourceAdminCard />
      <CalendarAnalyticsCard />
      <CalendarWorkflowSettings />
    </div>
  );
}
