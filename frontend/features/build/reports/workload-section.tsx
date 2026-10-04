"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { getUserDisplayName } from "@/lib/person-display";
import { Badge } from "@/components/ui/badge";

interface WorkloadSectionProps {
  projectId: number;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function WorkloadSection({ projectId }: WorkloadSectionProps) {
  const canView = useCan("build:view");

  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return toDateString(d);
  }, [today]);
  const end = useMemo(() => toDateString(today), [today]);

  const capacityMap = useWorkloadCapacity(projectId, start, end, undefined, {
    enabled: canView,
  });

  const { data: membersPage } = useProjectMembers(projectId, undefined, {
    enabled: canView,
  });

  const rows = useMemo(() => {
    const members = membersPage?.data ?? [];
    return members.map((m) => {
      const capacity = capacityMap.get(m.id);
      return {
        id: m.id,
        name: getUserDisplayName(m),
        estimateHours: capacity?.estimateHours ?? null,
        capacityHours: capacity?.capacityHours ?? null,
        isOverAllocated: capacity?.isOverAllocated ?? false,
      };
    });
  }, [membersPage, capacityMap]);

  if (!canView) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between rounded-md border p-3"
        >
          <span className="text-sm font-medium">{row.name}</span>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-xs tabular-nums">
              {row.estimateHours !== null ? `${row.estimateHours}h` : "—"} /{" "}
              {row.capacityHours !== null ? `${row.capacityHours}h` : "—"}
            </span>
            {row.isOverAllocated && (
              <Badge variant="destructive" className="text-xs">
                Overloaded
              </Badge>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">No members found</p>
      )}
    </div>
  );
}
