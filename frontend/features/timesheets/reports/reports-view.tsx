"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { format, subDays, parseISO, isValid } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useReportsOverview } from "@/hooks/api/timesheets-core/reports";
import { AiActionsMenu, type AiAction } from "@/components/ai/ai-actions-menu";
import { generateReportsNarrative } from "@/hooks/api/timesheets-core/ai";
import { OverviewReport } from "./overview-report";
import { ProjectBudgetsTab } from "./project-budgets-tab";
import { UtilizationTab } from "./utilization-tab";
import { ClientProfitabilityTab } from "./client-profitability-tab";
import { ComplianceTab } from "./compliance-tab";
import { ApprovalSlaTab } from "./approval-sla-tab";
import { BillingLeakageTab } from "./billing-leakage-tab";

const REPORT_TABS = [
  { value: "overview", label: "Overview" },
  { value: "utilization", label: "Utilization" },
  { value: "project-budgets", label: "Project Budgets" },
  { value: "client-profitability", label: "Client Profitability" },
  { value: "compliance", label: "Compliance" },
  { value: "approval-sla", label: "Approval SLA" },
  { value: "billing-leakage", label: "Billing Leakage" },
] as const;

function buildSubtitle(start: string, end: string): string {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (isValid(s) && isValid(e)) {
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
  } catch {
    // fall through
  }
  return "";
}

export function ReportsView() {
  const canView = useCan("timesheets:reports:view");
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaults = useMemo(() => {
    const now = new Date();
    return {
      start: format(subDays(now, 29), "yyyy-MM-dd"),
      end: format(now, "yyyy-MM-dd"),
    };
  }, []);

  const startDate = searchParams.get("start") ?? defaults.start;
  const endDate = searchParams.get("end") ?? defaults.end;
  const userId = searchParams.get("userId") ?? undefined;
  const activeTab = searchParams.get("tab") ?? "overview";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      updateParams({ start: range.from || null, end: range.to || null });
    },
    [updateParams],
  );

  const handleUserChange = useCallback(
    (value: string) => updateParams({ userId: value === "ALL" ? null : value }),
    [updateParams],
  );

  const handleTabChange = useCallback(
    (value: string) =>
      updateParams({ tab: value === "overview" ? null : value }),
    [updateParams],
  );

  const queryEnabled = canView && !!startDate && !!endDate;
  const rangeParams = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate],
  );

  const { data, isLoading, isError, refetch } = useReportsOverview(
    { startDate, endDate, userId },
    queryEnabled && activeTab === "overview",
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const narrativeActions = useMemo<AiAction[]>(
    () => [
      {
        key: "reports-narrative",
        label: "Summarize this report",
        description: "Plain-language read of the team's timesheet overview",
        surface: "sheet",
        disabledReason:
          activeTab !== "overview"
            ? "Switch to the Overview tab"
            : !data
              ? "No data to summarize yet"
              : undefined,
        run: async () => {
          const res = await generateReportsNarrative({
            startDate,
            endDate,
            userId,
          });
          return { text: res.text, aiUsage: res.aiUsage };
        },
      },
    ],
    [activeTab, data, startDate, endDate, userId],
  );

  const subtitle = buildSubtitle(startDate, endDate);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const pageFilters = (
    <>
      <DateRangePicker
        from={startDate}
        to={endDate}
        onChange={handleDateRangeChange}
      />
      <Select value={userId ?? "ALL"} onValueChange={handleUserChange}>
        <SelectTrigger
          className={cn(FILTER_SELECT_TRIGGER, "w-[160px]")}
          aria-label="Filter by member"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ALL">All members</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  if (!canView) {
    return (
      <PageWrapper title="Reports">
        <EmptyState
          illustration={<EmptyReportIllustration className="h-32 w-32" />}
          title="Access restricted"
          description="You don't have permission to view reports."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reports"
      subtitle={subtitle}
      filters={pageFilters}
      actions={
        <AiActionsMenu
          actions={narrativeActions}
          triggerLabel="AI summary"
          menuLabel="AI assist"
          align="end"
        />
      }
    >
      <motion.div
        {...motionProps}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList>
            {REPORT_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            {isError ? (
              <ErrorState
                title="Couldn't load report"
                description="Something went wrong while loading overview data."
                onRetry={handleRetry}
              />
            ) : (
              <OverviewReport overview={data} isLoading={isLoading} />
            )}
          </TabsContent>

          <TabsContent value="utilization" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <UtilizationTab
              params={rangeParams}
              enabled={queryEnabled && activeTab === "utilization"}
            />
          </TabsContent>

          <TabsContent value="project-budgets" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <ProjectBudgetsTab enabled={activeTab === "project-budgets"} />
          </TabsContent>

          <TabsContent value="client-profitability" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <ClientProfitabilityTab
              params={rangeParams}
              enabled={queryEnabled && activeTab === "client-profitability"}
            />
          </TabsContent>

          <TabsContent value="compliance" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <ComplianceTab
              params={rangeParams}
              enabled={queryEnabled && activeTab === "compliance"}
            />
          </TabsContent>

          <TabsContent value="approval-sla" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <ApprovalSlaTab
              params={rangeParams}
              enabled={queryEnabled && activeTab === "approval-sla"}
            />
          </TabsContent>

          <TabsContent value="billing-leakage" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <BillingLeakageTab
              params={rangeParams}
              enabled={queryEnabled && activeTab === "billing-leakage"}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </PageWrapper>
  );
}

export function ReportsPageSkeleton() {
  return (
    <PageWrapper
      title="Reports"
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-[120px] rounded-lg" />
      </div>
    </PageWrapper>
  );
}
