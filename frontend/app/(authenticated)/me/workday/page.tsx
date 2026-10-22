import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MyAttendancePage } from "@/features/hr/attendance/my-attendance-page";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeWorkday } from "@/lib/prefetch/me";

export default async function WorkdayPage() {
  await requireSession();
  const state = await prefetchMeWorkday();
  const hubChrome = {
    title: "Attendance & Time Off",
    subtitle: "Track work hours, leave and work-from-home requests.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} tabCount={4} />}>
      <HydrationBoundary state={state}>
        <SelfServiceHub
          hub="workday"
          content={{
            attendance: <MyAttendancePage hubChrome={hubChrome} />,
            "time-off": <LeavesWfhContent selfService hubChrome={hubChrome} />,
          }}
        />
      </HydrationBoundary>
    </Suspense>
  );
}
