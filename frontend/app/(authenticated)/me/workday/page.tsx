import { Suspense } from "react";
import { MyAttendancePage } from "@/features/hr/attendance/my-attendance-page";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";
import { SelfServiceHub, SelfServiceSectionSelector } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function WorkdayPage() {
  await requireSession();
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title="Attendance" />}>
      <SelfServiceHub
        hub="workday"
        content={{
          attendance: <MyAttendancePage sectionSelector={<SelfServiceSectionSelector />} />,
          "time-off": <LeavesWfhContent selfService sectionSelector={<SelfServiceSectionSelector />} />,
        }}
      />
    </Suspense>
  );
}
