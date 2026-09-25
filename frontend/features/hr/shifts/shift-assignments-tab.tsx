"use client";

import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useHrShifts, useShiftAssignments } from "@/hooks/api/hr/shifts";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

export function ShiftAssignmentsTab() {
  const { data: assignments, isLoading, isError, error, refetch } = useShiftAssignments();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  // Show the shift's name, never "Shift #12" (FE-85).
  const { data: shifts } = useHrShifts();
  const shiftNameById = new Map((shifts ?? []).map((shift) => [shift.id, shift.name]));

  type Assignment = NonNullable<typeof assignments>[number];

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: "userId",
      header: "Employee",
      cell: (a) => <span className="text-sm font-medium">{getUserDisplayName(memberById.get(a.userId))}</span>,
    },
    {
      key: "shiftId",
      header: "Shift",
      cell: (a) => <span className="text-sm">{shiftNameById.get(a.shiftId) ?? "Unknown shift"}</span>,
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
        <Badge variant={a.isActive ? "default" : "secondary"} className="text-dense">
          {a.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // No route guard; the read is gated on hr:attendance:view, so a denied
  // caller must be told so, not "No assignments yet" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
        {null}
      </PageState>
    );
  }

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={assignments ?? []}
      columns={columns}
      getRowKey={(a) => a.id}
      isLoading={isLoading}
      pagination={{ pageSize: 25 }}
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
