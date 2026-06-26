"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { Star, Target, Users, Calendar, AlertTriangle } from "lucide-react";
import { ReviewsTab } from "@/features/hr/performance/reviews-tab";
import { GoalsTab } from "@/features/hr/performance/goals-tab";
import { MeetingsTab } from "@/features/hr/performance/meetings-tab";
import { CyclesTab } from "@/features/hr/performance/cycles-tab";
import { PIPTab } from "@/features/hr/performance/pip-tab";

export default function PerformancePage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PerformanceContent />
    </DashboardGate>
  );
}

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "reviews";

  const handleTabChange = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "reviews") params.delete("tab");
    else params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <PageWrapper title="Performance" subtitle="Reviews, goals, and team development">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-9">
          <TabsTrigger value="reviews" className="text-xs gap-1.5 px-3">
            <Star className="h-3.5 w-3.5" />Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs gap-1.5 px-3">
            <Target className="h-3.5 w-3.5" />Goals
          </TabsTrigger>
          <TabsTrigger value="one-on-ones" className="text-xs gap-1.5 px-3">
            <Users className="h-3.5 w-3.5" />1-on-1s
          </TabsTrigger>
          <TabsTrigger value="cycles" className="text-xs gap-1.5 px-3">
            <Calendar className="h-3.5 w-3.5" />Cycles
          </TabsTrigger>
          <TabsTrigger value="pip" className="text-xs gap-1.5 px-3">
            <AlertTriangle className="h-3.5 w-3.5" />PIP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-3"><ReviewsTab /></TabsContent>
        <TabsContent value="goals" className="mt-3"><GoalsTab /></TabsContent>
        <TabsContent value="one-on-ones" className="mt-3"><MeetingsTab /></TabsContent>
        <TabsContent value="cycles" className="mt-3"><CyclesTab /></TabsContent>
        <TabsContent value="pip" className="mt-3"><PIPTab /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
