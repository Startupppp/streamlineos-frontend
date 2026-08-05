import { AttendanceContent } from "@/features/hr/attendance/components/attendance-content";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function MyAttendancePage() {
  await requirePermission("self:attendance");
  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours and manage check-ins."
      noInternalScroll
      contentClassName="flex flex-col"
    >
      <AttendanceContent />
    </PageWrapper>
  );
}
