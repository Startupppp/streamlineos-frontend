"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useShiftAssignments } from "@/hooks/api/hr/shifts";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

export function ShiftAssignmentsTab() {
  const { data: assignments, isLoading } = useShiftAssignments();

  const userIds = useMemo(
    () => [...new Set((assignments ?? []).map((a) => a.userId))],
    [assignments],
  );
  const { data: membersData } = useOrgMembersByIds(userIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  type Assignment = NonNullable<typeof assignments>[number];

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: "userId",
      header: "Employee",
      cell: (a) => <span className="text-sm font-medium">{getUserDisplayName(memberById.get(a.userId))}</span>,
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
      className="flex-1 min-h-0"
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
