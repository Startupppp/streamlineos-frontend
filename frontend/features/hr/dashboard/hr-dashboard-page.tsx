"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { HrDashboardMetrics } from "./hr-dashboard-metrics";
import { HrLeaveCalendar } from "./hr-leave-calendar";
import { HrOnboardingProgress } from "./hr-onboarding-progress";

export function HrDashboardPage() {
  return (
    <PageWrapper
      title="HR Dashboard"
      subtitle="People analytics — headcount, leaves and onboarding at a glance."
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <HrDashboardMetrics />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrLeaveCalendar />
          <HrOnboardingProgress />
        </div>
      </div>
    </PageWrapper>
  );
}
