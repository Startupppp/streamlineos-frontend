"use client";

import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "./attendance-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendancePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <PageWrapper title="Attendance" subtitle="Track your work hours and manage check-ins">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const userId = session?.user?.id;
  if (!userId) return null;
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN";

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
