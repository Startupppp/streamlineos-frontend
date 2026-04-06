"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceContent } from "./attendance-content";
import { MyWfhRequests, PendingWfhApprovals } from "@/components/hr/wfh-requests-list";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Home } from "lucide-react";

type Tab = "attendance" | "wfh";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) || "attendance";

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "attendance") params.delete("tab");
      else params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  if (status === "loading") {
    return (
      <PageWrapper title="Attendance" subtitle="Track your work hours and WFH requests">
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
      subtitle="Track your work hours and WFH requests"
      actions={activeTab === "wfh" ? <RequestWfhDialog /> : undefined}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-9">
          <TabsTrigger value="attendance" className="text-xs gap-1.5 px-3">
            <Clock className="h-3.5 w-3.5" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="wfh" className="text-xs gap-1.5 px-3">
            <Home className="h-3.5 w-3.5" />
            WFH Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceContent userId={userId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="wfh" className="mt-4 space-y-4">
          <MyWfhRequests />
          {isAdmin && <PendingWfhApprovals />}
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
