"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReportFiltersBar } from "@/features/support/reports/report-filters";
import {
  useQueuePerformanceReport,
  type QueuePerformanceRow,
  type SupportReportFilters,
} from "@/hooks/api/support/reports";
import { formatMinutes } from "@/features/support/reports/lib/format";

export default function QueuePerformanceReportPage() {
  const [filters, setFilters] = useState<SupportReportFilters>({});
  const { data, isLoading, isError, refetch } = useQueuePerformanceReport(filters);

  const rows = data ?? [];

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<QueuePerformanceRow>[] = [
    {
      key: "queueName",
      header: "Queue",
      cell: (row) => (
        <span className="font-medium">{row.queueName ?? "Unassigned"}</span>
      ),
      sortable: true,
      sortValue: (row) => row.queueName ?? "Unassigned",
    },
    {
      key: "ticketsHandled",
      header: "Tickets Handled",
      cell: (row) => row.ticketsHandled,
      sortable: true,
      sortValue: (row) => row.ticketsHandled,
    },
    {
      key: "openTickets",
      header: "Open",
      cell: (row) => row.openTickets,
      sortable: true,
      sortValue: (row) => row.openTickets,
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
      title="No queue activity"
      description="No tickets were handled through any queue in the selected range."
      compact
      className="min-h-[240px]"
    />
  );

  return (
    <PageWrapper
      title="Queue Performance"
      subtitle="Ticket load and resolution time by support queue."
      filters={<ReportFiltersBar filters={filters} onChange={setFilters} />}
    >
      {isError ? (
        <ErrorState title="Could not load queue performance" onRetry={handleRetry} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.queueId ?? "unassigned"}
          isLoading={isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 100 }}
          minWidth="560px"
        />
      )}
    </PageWrapper>
  );
}
