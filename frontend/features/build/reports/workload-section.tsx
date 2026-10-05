"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { getUserDisplayName } from "@/lib/person-display";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

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

  const capacity = useWorkloadCapacity(projectId, start, end, undefined, {
    enabled: canView,
  });

  const members = useProjectMembers(projectId, undefined, {
    ...INLINE_READ_ERROR,
    enabled: canView,
  });

  const rows = useMemo(() => {
    return (members.data?.data ?? []).map((m) => {
      const memberCapacity = capacity.data?.get(m.id);
      return {
        id: m.id,
        name: getUserDisplayName(m),
        estimateHours: memberCapacity?.estimateHours ?? null,
        capacityHours: memberCapacity?.capacityHours ?? null,
        isOverAllocated: memberCapacity?.isOverAllocated ?? false,
      };
    });
  }, [members.data, capacity.data]);

  const memberState = usePageState({
    permission: "build:view",
    isLoading: members.isLoading,
    isError: members.isError,
    error: members.error,
  });
  const capacityState = usePageState({
    permission: "build:tickets:view",
    isLoading: capacity.isLoading,
    isError: capacity.isError,
    error: capacity.error,
    isEmpty: rows.length === 0,
  });

  function handleRetryMembers() {
    void members.refetch();
  }

  function handleRetryCapacity() {
    void capacity.refetch();
  }

  return (
    <PageState
      resolution={memberState}
      loading={<LoadingState />}
      onRetry={handleRetryMembers}
    >
      <PageState
        resolution={capacityState}
        loading={<LoadingState />}
        onRetry={handleRetryCapacity}
        empty={<p className="text-muted-foreground text-sm">No members found</p>}
      >
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
        </div>
      </PageState>
    </PageState>
  );
}
