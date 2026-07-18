"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHrSlaReport } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertTriangle, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyReportIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import dynamic from "next/dynamic";

const SlaBreachChart = dynamic(
  () => import("@/features/hr/recruitment/components/sla-breach-chart").then((m) => ({ default: m.SlaBreachChart })),
  { ssr: false, loading: () => <Skeleton className="h-[260px] w-full" /> },
);

function breachColor(pct: number) {
  if (pct >= 50) return "text-destructive";
  if (pct >= 25) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function breachBg(pct: number) {
  if (pct >= 50) return "bg-destructive/10";
  if (pct >= 25) return "bg-yellow-50 dark:bg-yellow-950/20";
  return "bg-green-50 dark:bg-green-950/20";
}

interface SlaStageEntry {
  stage: string;
  breachPct: number;
  breached: number;
  total: number;
}

interface SlaReportRow {
  month: string;
  label: string;
  stages: SlaStageEntry[];
  overall: { breachPct: number; total: number };
}

function MonthlyBreakdownTable({
  report,
  stages,
}: {
  report: SlaReportRow[];
  stages: string[];
}) {
  const columns = useMemo<DataTableColumn<SlaReportRow>[]>(() => {
    const fixedMonth: DataTableColumn<SlaReportRow> = {
      key: "month",
      header: "Month",
      cell: (row) => <span className="font-medium">{row.label}</span>,
      headerClassName: "text-left",
    };

    const stageCols: DataTableColumn<SlaReportRow>[] = stages.map((stage) => ({
      key: `stage_${stage}`,
      header: stage,
      cell: (row) => {
        const st = row.stages.find((s) => s.stage === stage);
        if (!st || st.total === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className={cn("font-medium", breachColor(st.breachPct))}>
            {st.breachPct}%
            <span className="text-muted-foreground font-normal ml-1">
              ({st.breached}/{st.total})
            </span>
          </span>
        );
      },
      className: "text-center",
      headerClassName: "text-center",
    }));

    const overallCol: DataTableColumn<SlaReportRow> = {
      key: "overall",
      header: "Overall",
      cell: (row) => {
        if (row.overall.total === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Badge
            variant={
              row.overall.breachPct >= 50
                ? "destructive"
                : row.overall.breachPct >= 25
                  ? "secondary"
                  : "outline"
            }
            className="text-[10px]"
          >
            {row.overall.breachPct}%
          </Badge>
        );
      },
      className: "text-center",
      headerClassName: "text-center",
    };

    return [fixedMonth, ...stageCols, overallCol];
  }, [stages]);

  return (
    <DataTable
      data={report}
      columns={columns}
      getRowKey={(row) => row.month}
      className="text-[10px] md:text-xs"
    />
  );
}

export default function SlaReportPage() {
  const { data, isLoading, isError, refetch } = useHrSlaReport();

  function handleRetry() { void refetch(); }

  return (
    <PageWrapper
      title="SLA Breach Report"
      subtitle="Monthly % of candidates who breached SLA per recruitment stage"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/recruitment/sla">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            SLA Config
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
          <AlertCircle className="h-10 w-10 text-destructive/50" />
          <p className="text-sm text-muted-foreground">Failed to load SLA breach report.</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : !data || data.stages.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyReportIllustration />}
          title="No SLA tracking data yet"
          description="SLA data is recorded as candidates move through recruitment stages."
          action={{ label: "Configure SLAs", href: "/hr/recruitment/sla" }}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              6-Month Stage Summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.stageSummary.map((s) => (
                <Card key={s.stage} className={cn("overflow-hidden", breachBg(s.avgBreachPct))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.stage}</p>
                        <p className={cn("text-2xl font-bold mt-0.5", breachColor(s.avgBreachPct))}>
                          {s.avgBreachPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">avg breach rate</p>
                      </div>
                      {s.avgBreachPct >= 25 && (
                        <AlertTriangle className={cn("h-4 w-4 mt-1", s.avgBreachPct >= 50 ? "text-destructive" : "text-yellow-500")} />
                      )}
                    </div>
                    <Progress value={s.avgBreachPct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {s.totalBreached} of {s.totalAll} total breached
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Breach % by Stage — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <SlaBreachChart reportData={data.report} stages={data.stages} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MonthlyBreakdownTable report={data.report} stages={data.stages} />
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
