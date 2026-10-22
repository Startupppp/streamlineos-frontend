import { Suspense } from "react";
import { MyAttendancePage } from "@/features/hr/attendance/my-attendance-page";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function WorkdayPage() {
  await requireSession();
  const hubChrome = {
    title: "Attendance & Time Off",
    subtitle: "Track work hours, leave and work-from-home requests.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} tabCount={4} />}>
      <SelfServiceHub
        hub="workday"
        content={{
          attendance: <MyAttendancePage hubChrome={hubChrome} />,
          "time-off": <LeavesWfhContent selfService hubChrome={hubChrome} />,
        }}
      />
    </Suspense>
  );
}
