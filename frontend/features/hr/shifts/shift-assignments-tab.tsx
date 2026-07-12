"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useShiftAssignments } from "@/hooks/api/hr/shifts";

interface Props {
  canManage: boolean;
}

export function ShiftAssignmentsTab({ canManage: _canManage }: Props) {
  const { data: assignments, isLoading } = useShiftAssignments();

  type Assignment = NonNullable<typeof assignments>[number];

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: "userId",
      header: "Employee ID",
      cell: (a) => <span className="text-sm font-medium">{a.userId}</span>,
    },
    {
      key: "shiftId",
      header: "Shift ID",
      cell: (a) => <span className="text-sm">Shift #{a.shiftId}</span>,
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      cell: (a) => <span className="text-sm">{a.effectiveFrom}</span>,
    },
    {
      key: "effectiveTo",
      header: "Effective To",
      cell: (a) => <span className="text-sm">{a.effectiveTo ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => (
        <Badge variant={a.isActive ? "default" : "secondary"} className="text-[11px]">
          {a.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      data={assignments ?? []}
      columns={columns}
      getRowKey={(a) => a.id}
      isLoading={isLoading}
      emptyState={
        <EmptyState
          illustrationPreset="calendar"
          title="No assignments yet"
          description="Assign shifts to employees to see them here"
          className="border-0 bg-transparent shadow-none h-64"
          compact
        />
      }
    />
  );
}
