"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useSimulationHistory, type SimulationRecord, type SimulationType } from "@/hooks/api/hr/enterprise-ops-simulator";
import { format } from "date-fns";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/build/shared/resolve-user-name";

const TYPE_COLORS: Record<SimulationType, string> = {
  policy: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  leave: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  attendance: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
  approval: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  payroll: "bg-muted text-muted-foreground",
};

export function SimulationHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSimulationHistory({ page });
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  const columns: DataTableColumn<SimulationRecord>[] = useMemo(() => [
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
      cell: (r) => <span className="text-sm text-foreground">{resolveMemberName(r.createdBy)}</span>,
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
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {String((r.result as Record<string, unknown>)?.simulation ?? "")}
        </span>
      ),
    },
  ], [resolveMemberName]);

  return (
    <DataTable
      data={data?.data ?? []}
      columns={columns}
      getRowKey={(r) => r.id}
      isLoading={isLoading}
      emptyState={
        <EmptyState
          illustrationPreset="chart"
          title="No simulations run yet"
          description="Run a simulation to preview policy, leave, attendance, or payroll outcomes."
          compact
        />
      }
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
