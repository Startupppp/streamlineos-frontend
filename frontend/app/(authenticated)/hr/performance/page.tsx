"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollEdgeFade } from "@/components/ui/scroll-edge-fade";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  Star,
  Target,
  Users,
  Calendar,
  AlertTriangle,
  BarChart3,
  Grid3x3,
  ArrowUpDown,
} from "lucide-react";
import { ReviewsTab } from "@/features/hr/performance/reviews-tab";
import { GoalsTab } from "@/features/hr/performance/goals-tab";
import { MeetingsTab } from "@/features/hr/performance/meetings-tab";
import { CyclesTab } from "@/features/hr/performance/cycles-tab";
import { PIPTab } from "@/features/hr/performance/pip-tab";
import { CalibrationTab } from "@/features/hr/performance/calibration-tab";
import { NineBoxGrid } from "@/features/hr/performance/nine-box-grid";
import { SuccessionTab } from "@/features/hr/performance/succession-tab";
import { cn } from "@/lib/utils";

const TAB_TRIGGER_CLASS =
  "h-9 min-h-9 flex-none shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs text-muted-foreground shadow-none transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

export default function PerformancePage() {
  return (
    <DashboardGate permission="hr:performance:manage">
      <PerformanceContent />
    </DashboardGate>
  );
}

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "reviews";
  const tabsListRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "reviews") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [searchParams, router],
  );

  useEffect(() => {
    const active = tabsListRef.current?.querySelector<HTMLElement>(
      '[data-state="active"]',
    );
    active?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeTab]);

  return (
    <PageWrapper
      title="Performance"
      subtitle="Reviews, goals, and team development"
      variant="display"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <ScrollEdgeFade className="shrink-0 border-b border-border">
          <TabsList
            ref={tabsListRef}
            className={cn(
              "h-auto min-h-9 w-max min-w-full justify-start gap-0 overflow-visible rounded-none border-0 bg-transparent p-0",
            )}
          >
            <TabsTrigger value="reviews" className={TAB_TRIGGER_CLASS}>
              <Star className="h-3.5 w-3.5" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="goals" className={TAB_TRIGGER_CLASS}>
              <Target className="h-3.5 w-3.5" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="one-on-ones" className={TAB_TRIGGER_CLASS}>
              <Users className="h-3.5 w-3.5" />
              1-on-1s
            </TabsTrigger>
            <TabsTrigger value="cycles" className={TAB_TRIGGER_CLASS}>
              <Calendar className="h-3.5 w-3.5" />
              Cycles
            </TabsTrigger>
            <TabsTrigger value="pip" className={TAB_TRIGGER_CLASS}>
              <AlertTriangle className="h-3.5 w-3.5" />
              PIP
            </TabsTrigger>
            <TabsTrigger value="calibration" className={TAB_TRIGGER_CLASS}>
              <BarChart3 className="h-3.5 w-3.5" />
              Calibration
            </TabsTrigger>
            <TabsTrigger value="nine-box" className={TAB_TRIGGER_CLASS}>
              <Grid3x3 className="h-3.5 w-3.5" />
              9-Box
            </TabsTrigger>
            <TabsTrigger value="succession" className={TAB_TRIGGER_CLASS}>
              <ArrowUpDown className="h-3.5 w-3.5" />
              Succession
            </TabsTrigger>
          </TabsList>
        </ScrollEdgeFade>

        <TabsContent value="reviews" className="mt-4 flex flex-col">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="goals" className="mt-4 flex flex-col">
          <GoalsTab />
        </TabsContent>
        <TabsContent value="one-on-ones" className="mt-4 flex flex-col">
          <MeetingsTab />
        </TabsContent>
        <TabsContent value="cycles" className="mt-4 flex flex-col">
          <CyclesTab />
        </TabsContent>
        <TabsContent value="pip" className="mt-4 flex flex-col">
          <PIPTab />
        </TabsContent>
        <TabsContent value="calibration" className="mt-4 flex flex-col">
          <CalibrationTab />
        </TabsContent>
        <TabsContent value="nine-box" className="mt-4 flex flex-col">
          <NineBoxGrid />
        </TabsContent>
        <TabsContent value="succession" className="mt-4 flex flex-col">
          <SuccessionTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
