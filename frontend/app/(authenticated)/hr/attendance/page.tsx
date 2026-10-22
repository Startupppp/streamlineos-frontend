import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "@/features/hr/attendance/components/attendance-content";
import { prefetchAttendanceStatus } from "@/lib/prefetch/hr-time";
import AttendanceLoading from "./loading";

async function AttendanceHydrated({ isAdmin }: { isAdmin: boolean }) {
  const state = await prefetchAttendanceStatus();
  return (
    <HydrationBoundary state={state}>
      <PageWrapper
        title="Attendance"
        subtitle="Track your work hours and manage check-ins."
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <AttendanceContent isAdmin={isAdmin} />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default async function AttendancePage() {
  const { access } = await requirePermission("hr:attendance:view");
  const isAdmin = access.isOrgOwner || "hr:attendance:manage" in access.scopes;
  return (
    <Suspense fallback={<AttendanceLoading />}>
      <AttendanceHydrated isAdmin={isAdmin} />
    </Suspense>
  );
}
