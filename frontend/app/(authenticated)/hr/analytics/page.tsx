"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useHrAnalytics,
  useHrAttritionAnalytics,
} from "@/lib/api/hooks/hr/analytics";
import { useRecruitmentStats } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingDown,
  Briefcase,
  Activity,
  CalendarDays,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { WorkforceSection } from "@/features/hr/analytics/workforce-section";
import { RecruitmentSection } from "@/features/hr/analytics/recruitment-section";
import { AttendanceSection } from "@/features/hr/analytics/attendance-section";
import { LeaveSection } from "@/features/hr/analytics/leave-section";
import { AttritionSection } from "@/features/hr/analytics/attrition-section";
import { cn } from "@/lib/utils";

type DateRange = "month" | "quarter" | "year";
type SectionTab = "workforce" | "recruitment" | "attendance" | "leaves" | "attrition";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

const DATE_RANGE_VALUES: readonly DateRange[] = ["month", "quarter", "year"];
const SECTION_TAB_VALUES: readonly SectionTab[] = ["workforce", "recruitment", "attendance", "leaves", "attrition"];

function isDateRange(v: string): v is DateRange {
  return (DATE_RANGE_VALUES as readonly string[]).includes(v);
}

function isSectionTab(v: string): v is SectionTab {
  return (SECTION_TAB_VALUES as readonly string[]).includes(v);
}

const SECTION_TABS: Array<{
  value: SectionTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "workforce", label: "Workforce", icon: Users },
  { value: "recruitment", label: "Recruitment", icon: Briefcase },
  { value: "attendance", label: "Attendance", icon: Activity },
  { value: "leaves", label: "Leaves", icon: CalendarDays },
  { value: "attrition", label: "Attrition", icon: TrendingDown },
];

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const handleChange = useCallback(
    (v: string) => {
      if (isDateRange(v)) onChange(v);
    },
    [onChange],
  );

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)]">
        <SelectItem value="month">This Month</SelectItem>
        <SelectItem value="quarter">This Quarter</SelectItem>
        <SelectItem value="year">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                item.valueColor,
              )}
            >
              {item.value}
            </p>
          </div>
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
              item.iconBg,
            )}
          >
            <Icon
              className={cn("h-3.5 w-3.5", item.iconColor)}
              aria-hidden="true"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutiveKPIs({
  totalEmployees,
  attritionRate,
  openPositions,
  attendanceLogs,
  isLoading,
}: {
  totalEmployees: number;
  attritionRate: string;
  openPositions: number;
  attendanceLogs: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
          >
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis: KpiItem[] = [
    {
      label: "Total Employees",
      value: totalEmployees,
      icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-700 dark:text-blue-400",
    },
    {
      label: "Attrition Rate",
      value: `${attritionRate}%`,
      icon: TrendingDown,
      iconBg: "bg-rose-100 dark:bg-rose-950/40",
      iconColor: "text-rose-600 dark:text-rose-400",
      valueColor: "text-rose-700 dark:text-rose-400",
    },
    {
      label: "Open Positions",
      value: openPositions,
      icon: Briefcase,
      iconBg: "bg-amber-100 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Attendance Logs",
      value: attendanceLogs,
      icon: Activity,
      iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [activeSection, setActiveSection] = useState<SectionTab>("workforce");

  const analyticsYear = useMemo(() => CURRENT_YEAR, []);

  const analyticsMonth = useMemo(() => {
    if (dateRange === "month") return CURRENT_MONTH;
    if (dateRange === "quarter") return Math.ceil(CURRENT_MONTH / 3) * 3 - 2;
    return 1;
  }, [dateRange]);

  const { data, isLoading: isAnalyticsLoading, isError, refetch } = useHrAnalytics();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { data: recruitmentStats, isLoading: isRecruitmentLoading } =
    useRecruitmentStats();
  const { data: attritionData, isLoading: isAttritionLoading } =
    useHrAttritionAnalytics();

  const isTopLoading =
    isAnalyticsLoading || isRecruitmentLoading || isAttritionLoading;

  const totalEmployees = data?.headcount.active ?? 0;
  const attritionRate = attritionData?.attritionRatePercent ?? "0.0";
  const openPositions = recruitmentStats?.openJobs ?? 0;
  const attendanceLogs = data?.attendance.totalLogsThisMonth ?? 0;

  const handleSectionChange = useCallback((v: string) => {
    if (isSectionTab(v)) setActiveSection(v);
  }, []);

  if (isError) {
    return (
      <PageWrapper
        title="HR Analytics"
        subtitle="Workforce insights and operational metrics"
      >
        <EmptyState
          illustration={<AlertCircle className="h-8 w-8 text-destructive" />}
          title="Failed to load analytics"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights and operational metrics"
      actions={<DateRangeSelector value={dateRange} onChange={setDateRange} />}
    >
      <div className="space-y-6">
        <ExecutiveKPIs
          totalEmployees={totalEmployees}
          attritionRate={attritionRate}
          openPositions={openPositions}
          attendanceLogs={attendanceLogs}
          isLoading={isTopLoading}
        />

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
              <BarChart3
                className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Detailed Analytics
            </h2>
          </div>

          <Tabs value={activeSection} onValueChange={handleSectionChange}>
            <div className="px-4 pt-3 border-b border-border pb-3">
              <TabsList className="h-8 rounded-lg border p-1 bg-muted/50 gap-0.5">
                {SECTION_TABS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="text-[11px] px-3 h-6 rounded-md gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="workforce" className="mt-0">
                <WorkforceSection data={data} isLoading={isAnalyticsLoading} />
              </TabsContent>

              <TabsContent value="recruitment" className="mt-0">
                <RecruitmentSection isLoading={isRecruitmentLoading} />
              </TabsContent>

              <TabsContent value="attendance" className="mt-0">
                <AttendanceSection
                  year={analyticsYear}
                  month={analyticsMonth}
                />
              </TabsContent>

              <TabsContent value="leaves" className="mt-0">
                <LeaveSection year={analyticsYear} />
              </TabsContent>

              <TabsContent value="attrition" className="mt-0">
                <AttritionSection isLoading={isAttritionLoading} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate permission="hr:performance:view">
      <AnalyticsContent />
    </DashboardGate>
  );
}
