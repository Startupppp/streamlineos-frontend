"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReportFiltersBar } from "@/features/support/reports/report-filters";
import {
  useAgentPerformanceReport,
  type AgentPerformanceRow,
  type SupportReportFilters,
} from "@/hooks/api/support/reports";
import { useOrgMembers } from "@/hooks/api/organization";
import { formatMinutes } from "@/features/support/reports/lib/format";

export default function AgentPerformanceReportPage() {
  const [filters, setFilters] = useState<SupportReportFilters>({});
  const { data, isLoading, isError, refetch } = useAgentPerformanceReport(filters);
  const membersQuery = useOrgMembers(1, 100);

  const nameByAgentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of membersQuery.data?.data ?? []) {
      map.set(member.userId, member.name ?? member.email);
    }
    return map;
  }, [membersQuery.data]);

  const rows = data ?? [];

  function handleRetry() {
    void refetch();
  }

  function resolveAgentName(row: AgentPerformanceRow): string {
    return nameByAgentId.get(row.agentId) ?? row.agentId;
  }

  const columns: DataTableColumn<AgentPerformanceRow>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (row) => <span className="font-medium">{resolveAgentName(row)}</span>,
      sortable: true,
      sortValue: resolveAgentName,
    },
    {
      key: "ticketsHandled",
      header: "Tickets Handled",
      cell: (row) => row.ticketsHandled,
      sortable: true,
      sortValue: (row) => row.ticketsHandled,
    },
    {
      key: "ticketsResolved",
      header: "Resolved",
      cell: (row) => row.ticketsResolved,
      sortable: true,
      sortValue: (row) => row.ticketsResolved,
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
      title="No agent activity"
      description="No tickets were handled by agents in the selected range."
      compact
      className="min-h-[240px]"
    />
  );

  return (
    <PageWrapper
      title="Agent Performance"
      subtitle="Ticket handling metrics by support agent."
      filters={<ReportFiltersBar filters={filters} onChange={setFilters} />}
    >
      {isError ? (
        <ErrorState title="Could not load agent performance" onRetry={handleRetry} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.agentId}
          isLoading={isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 100 }}
          minWidth="620px"
        />
      )}
    </PageWrapper>
  );
}
