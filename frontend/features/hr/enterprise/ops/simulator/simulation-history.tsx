"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { useSimulationHistory, type SimulationRecord, type SimulationType } from "@/hooks/api/hr/enterprise-ops-simulator";
import { format } from "date-fns";

const TYPE_COLORS: Record<SimulationType, string> = {
  policy: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  leave: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  attendance: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
  approval: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
  payroll: "bg-muted text-muted-foreground",
};

export function SimulationHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSimulationHistory({ page });

  const columns: DataTableColumn<SimulationRecord>[] = [
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <Badge variant="secondary" className={`text-xs capitalize ${TYPE_COLORS[r.type]}`}>
          <FlaskConical className="h-3 w-3 mr-1" />
          {r.type}
        </Badge>
      ),
    },
    {
      key: "createdBy",
      header: "Run By",
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.createdBy.slice(0, 8)}…</span>,
    },
    {
      key: "createdAt",
      header: "Run At",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "simulation",
      header: "Label",
      cell: (r) => (
        <span className="text-xs text-amber-700 dark:text-amber-400">
          {String((r.result as Record<string, unknown>)?.simulation ?? "")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={data?.data ?? []}
      columns={columns}
      getRowKey={(r) => r.id}
      isLoading={isLoading}
      emptyState={<p className="text-sm text-muted-foreground text-center py-8">No simulations run yet</p>}
      pagination={
        data
          ? {
              mode: "server",
              page,
              pageSize: data.pagination.limit,
              total: data.pagination.total,
              onPageChange: setPage,
            }
          : undefined
      }
    />
  );
}
