"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { REP_CALL_METRICS_LAYOUT } from "@/lib/renderer/crm/rep-call-metrics-layout";
import type { RepCallMetrics, RepCallMetricsResponse } from "@/types/crm/call-intelligence";
import { formatBpsPercent, formatQuestionsPerTenTurns } from "./call-metric-format";
import { RepTrendSparkline } from "./rep-trend-sparkline";

interface RepMetricsTableProps {
  response: RepCallMetricsResponse;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const FORMER_MEMBER = "Former member";

function repCallMetricsRecordFields(metrics: RepCallMetrics): Record<string, unknown> {
  return {
    repUserId: metrics.repUserId,
    rep: metrics.repName ?? FORMER_MEMBER,
    callsAnalysed: metrics.callsAnalysed,
    talkRatio:
      metrics.medianTalkRatioBps === null ? null : formatBpsPercent(metrics.medianTalkRatioBps),
    questionRate:
      metrics.medianQuestionRateBps === null
        ? null
        : formatQuestionsPerTenTurns(metrics.medianQuestionRateBps),
    nextStep:
      metrics.nextStepCommittedBps === null
        ? null
        : formatBpsPercent(metrics.nextStepCommittedBps),
    talkRatioTrend: metrics.trend,
    embargoed: metrics.embargoed === 0 ? null : metrics.embargoed,
  };
}

export function RepMetricsTable({
  response,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: RepMetricsTableProps) {
  const layout = useTenantLayout(REP_CALL_METRICS_LAYOUT);

  const rows = useMemo(
    () => asRecordValues(response.data.map(repCallMetricsRecordFields)),
    [response.data],
  );

  const cells = useMemo(
    () => ({
      talkRatioTrend: (row: RecordValue) => {
        const metrics = response.data.find(
          (candidate) => candidate.repUserId === row.repUserId,
        );
        if (!metrics) return null;
        return (
          <RepTrendSparkline
            points={metrics.trend}
            metric="talkRatio"
            bucket={response.meta.bucket}
            repLabel={metrics.repName ?? FORMER_MEMBER}
          />
        );
      },
    }),
    [response.data, response.meta.bucket],
  );

  return (
    <RecordList
      layout={layout}
      rows={rows}
      getRowKey={(row) => String(row.repUserId)}
      cells={cells}
      isLoading={isLoading}
      className="flex-1 min-h-0"
      minWidth="820px"
      emptyState={
        <EmptyState
          className="border-0 bg-transparent min-h-[40vh]"
          title="No call metrics yet"
          description={
            response.meta.scope === "own"
              ? "None of your calls in this window has an analysis you can read yet. Analyses appear on the call itself once one has been run."
              : "No analysed call in this window has opened for you. A rep sees their own analysis first; the rest follow once shared or once the private window elapses."
          }
        />
      }
      pagination={{
        mode: "server",
        page,
        pageSize,
        total: response.pagination.total,
        onPageChange,
      }}
    />
  );
}
