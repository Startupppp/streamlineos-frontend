"use client";

import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "./attendance-content";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const isAdmin = useCan("hr:attendance:manage");

  if (status === "loading") {
    return (
      <PageWrapper
        title="Attendance"
        subtitle="Track your work hours and manage check-ins"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 space-y-3">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="lg:col-span-8 space-y-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const userId = session?.user?.id;
  if (!userId) return null;

  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours and manage check-ins"
      noInternalScroll
      contentClassName="flex flex-col"
    >
      <AttendanceContent userId={userId} isAdmin={isAdmin} />
    </PageWrapper>
  );
}
