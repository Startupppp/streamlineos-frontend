"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { RepCallMetrics, RepCallMetricsResponse } from "@/types/crm/call-intelligence";
import { METRIC_UNKNOWN, formatBpsPercent, formatQuestionsPerTenTurns } from "./call-metric-format";
import { RepTrendSparkline } from "./rep-trend-sparkline";

interface RepMetricsTableProps {
  response: RepCallMetricsResponse;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * CRM-P2-05's table: how each person's calls went, and which way they are going.
 *
 * Two decisions here are the ticket rather than styling.
 *
 * **The table is not sortable.** `DataTable` will sort client-side the moment a
 * column declares `sortable`, and a sortable talk-ratio column is a league
 * table — the thing `call-coaching.controller.ts` refuses to build, arrived at
 * through a prop. The server returns rows in call-count order, which says how
 * much of the window is about each person, and the client renders that order.
 *
 * **No column ever renders a raw id.** `repName` is null for somebody who has
 * left the organisation, and the fallback is the word "Former member" rather
 * than a UUID. A visible identifier in a coaching table is both a house rule and
 * a bad answer to "who is this row about".
 *
 * The `embargoed` column is here and not hidden. A manager reading "6 calls" for
 * a rep who made eight needs to know the other two are the rep's to see first;
 * without the column the median silently describes a period that is not the one
 * in the heading.
 */
export function RepMetricsTable({
  response,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: RepMetricsTableProps) {
  const columns: DataTableColumn<RepCallMetrics>[] = [
    {
      key: "rep",
      header: "Rep",
      cell: (row) => (
        <span className="truncate text-sm font-medium">
          {row.repName ?? "Former member"}
        </span>
      ),
    },
    {
      key: "calls",
      header: "Calls",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => row.callsAnalysed,
    },
    {
      key: "talkRatio",
      header: "Talk ratio",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => formatBpsPercent(row.medianTalkRatioBps),
    },
    {
      key: "questionRate",
      header: "Questions / 10 turns",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => formatQuestionsPerTenTurns(row.medianQuestionRateBps),
    },
    {
      key: "nextStep",
      header: "Next step",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => formatBpsPercent(row.nextStepCommittedBps),
    },
    {
      key: "trend",
      header: "Talk ratio trend",
      className: "w-32",
      cell: (row) => (
        <RepTrendSparkline
          points={row.trend}
          metric="talkRatio"
          bucket={response.meta.bucket}
          repLabel={row.repName ?? "Former member"}
        />
      ),
    },
    {
      key: "embargoed",
      header: "Still private",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) =>
        row.embargoed === 0 ? (
          <span className="text-muted-foreground">{METRIC_UNKNOWN}</span>
        ) : (
          row.embargoed
        ),
    },
  ];

  return (
    <DataTable
      data={response.data}
      columns={columns}
      getRowKey={(row) => row.repUserId}
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
