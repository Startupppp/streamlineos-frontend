"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReportFiltersBar } from "@/features/support/reports/report-filters";
import {
  useChannelPerformanceReport,
  type ChannelPerformanceRow,
  type SupportReportFilters,
} from "@/hooks/api/support/reports";
import { formatMinutes } from "@/features/support/reports/lib/format";

function formatChannelLabel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export default function ChannelPerformanceReportPage() {
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
      cell: (row) => <span className="font-medium">{formatChannelLabel(row.channel)}</span>,
      sortable: true,
      sortValue: (row) => row.channel,
    },
    {
      key: "ticketsHandled",
      header: "Tickets Handled",
      cell: (row) => row.ticketsHandled,
      sortable: true,
      sortValue: (row) => row.ticketsHandled,
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
    >
      {isError ? (
        <ErrorState title="Could not load channel performance" onRetry={handleRetry} />
      ) : (
        <DataTable
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
