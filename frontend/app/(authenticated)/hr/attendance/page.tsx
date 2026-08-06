"use client";

import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "@/features/hr/attendance/components/attendance-content";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";

export default function AttendancePage() {
  const { status } = useSession();
  const isAdmin = useCan("hr:attendance:manage");

  if (status === "loading") {
    return (
      <PageWrapper
        title="Attendance"
        subtitle="Track your work hours and manage check-ins."
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

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
