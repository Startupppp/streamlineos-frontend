"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
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

/** A rep who has left is named in words. A coaching table never shows an id. */
const FORMER_MEMBER = "Former member";

/**
 * One rep's row in the shape `REP_CALL_METRICS_LAYOUT` names.
 *
 * The mapping lives here rather than beside the description, and deliberately:
 * the three ratios are formatted by `call-metric-format.ts`, which is this
 * feature's module, and a layout under `lib/renderer/` importing from
 * `features/` would point the dependency backwards. What the description owns is
 * the shape; what this owns is reading the wire into it.
 *
 * A missing median is left empty rather than filled with the formatter's own em
 * dash, so the engine renders its own — muted, like every other nothing in the
 * table, instead of a plain dash that only looks the same in one theme. Printing
 * `0%` would report a rep as having said nothing, which is the fabrication
 * `transcript-metrics.ts` refuses to make on the way in.
 */
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
    /*
      Zero is an absence here, not a figure. There is no embargo to report, and
      a "0" in that column reads as a claim about the rep's period.
    */
    embargoed: metrics.embargoed === 0 ? null : metrics.embargoed,
  };
}

/**
 * CRM-P2-05's table: how each person's calls went, and which way they are going.
 *
 * No table is written here. The columns, their labels, their alignment and the
 * mobile card all come from `REP_CALL_METRICS_LAYOUT`. The server returns rows
 * in call-count order and the client renders that order — no `sortState` is
 * passed, so no header offers to change it; a sortable talk ratio is a league
 * table, which is the thing `call-coaching.controller.ts` refuses to build.
 *
 * The one thing the description cannot draw is the trend. It declares the field
 * a `series` — a run of figures rather than one — and this supplies the drawing
 * through `cells`, because the chart's meaning is domain the engine does not
 * have: these are basis points, the buckets come from `meta.bucket`, and a
 * bucket with no calls is a gap rather than a flat line, because a straight line
 * across a quiet fortnight claims nothing changed rather than that nothing
 * happened.
 */
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
