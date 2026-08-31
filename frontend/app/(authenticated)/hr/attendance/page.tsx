import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "@/features/hr/attendance/components/attendance-content";

export default async function AttendancePage() {
  const { access } = await requirePermission("hr:attendance:view");
  const isAdmin = access.isOrgOwner || "hr:attendance:manage" in access.scopes;
  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours and manage check-ins."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <AttendanceContent isAdmin={isAdmin} />
    </PageWrapper>
  );
}
