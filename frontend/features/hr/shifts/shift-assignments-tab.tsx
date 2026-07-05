"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShiftAssignments } from "@/hooks/api/hr/shifts";

interface Props {
  canManage: boolean;
}

export function ShiftAssignmentsTab({ canManage: _canManage }: Props) {
  const { data: assignments, isLoading } = useShiftAssignments();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!assignments?.length) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        title="No assignments yet"
        description="Assign shifts to employees to see them here"
        className="border-0 bg-transparent shadow-none h-64"
        compact
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="text-xs font-semibold">Employee ID</TableHead>
            <TableHead className="text-xs font-semibold">Shift ID</TableHead>
            <TableHead className="text-xs font-semibold">Effective From</TableHead>
            <TableHead className="text-xs font-semibold">Effective To</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.userId}</TableCell>
              <TableCell className="text-sm">Shift #{a.shiftId}</TableCell>
              <TableCell className="text-sm">{a.effectiveFrom}</TableCell>
              <TableCell className="text-sm">{a.effectiveTo ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={a.isActive ? "default" : "secondary"} className="text-[11px]">
                  {a.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
