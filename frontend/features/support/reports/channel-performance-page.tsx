"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReportFiltersBar } from "./report-filters";
import { ExportCsvButton } from "./export-csv-button";
import {
  useChannelPerformanceReport,
  type ChannelPerformanceRow,
  type SupportReportFilters,
} from "@/hooks/api/support/reports";
import { formatMinutes } from "./lib/format";

function formatChannelLabel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export function ChannelPerformancePage() {
  const [filters, setFilters] = useState<SupportReportFilters>({});
  const { data, isLoading, isError, refetch } = useChannelPerformanceReport(filters);

  const rows = data ?? [];

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<ChannelPerformanceRow>[] = [
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <Link
          href={`/support/inbox?channel=${encodeURIComponent(row.channel)}`}
          className="font-medium text-primary hover:underline"
        >
          {formatChannelLabel(row.channel)}
        </Link>
      ),
    },
    {
      key: "ticketsHandled",
      header: "Tickets Handled",
      cell: (row) => row.ticketsHandled,
    },
    {
      key: "avgFirstResponseMinutes",
      header: "Avg First Response",
      cell: (row) => formatMinutes(row.avgFirstResponseMinutes),
    },
    {
      key: "avgResolutionMinutes",
      header: "Avg Resolution",
      cell: (row) => formatMinutes(row.avgResolutionMinutes),
    },
  ];

  const emptyState = (
    <EmptyState
      illustrationPreset="report"
      title="No channel activity"
      description="No tickets came through any channel in the selected range."
      compact
      className="min-h-[240px]"
    />
  );

  return (
    <PageWrapper
      title="Channel Performance"
      subtitle="Ticket volume and response time by intake channel."
      filters={<ReportFiltersBar filters={filters} onChange={setFilters} />}
      actions={
        <ExportCsvButton
          filename="channel-performance.csv"
          rows={rows.map((row) => ({
            channel: formatChannelLabel(row.channel),
            ticketsHandled: row.ticketsHandled,
            avgFirstResponseMinutes: row.avgFirstResponseMinutes ?? "",
            avgResolutionMinutes: row.avgResolutionMinutes ?? "",
          }))}
        />
      }
    >
      {isError ? (
        <ErrorState title="Could not load channel performance" onRetry={handleRetry} />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={(row) => row.channel}
          isLoading={isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 100 }}
          minWidth="560px"
        />
      )}
    </PageWrapper>
  );
}
