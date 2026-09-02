"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSimulationHistory, type SimulationRecord, type SimulationType } from "@/hooks/api/hr/enterprise-ops-simulator";
import { format } from "date-fns";
import { useOrgMembers } from "@/hooks/api/organization";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";

const TYPE_COLORS: Record<SimulationType, string> = {
  policy: "bg-status-info-surface text-status-info-ink",
  leave: "bg-status-success-surface text-status-success-ink",
  attendance: "bg-status-warning-surface text-status-warning-ink",
  approval: "bg-status-info-surface text-status-info-ink",
  payroll: "bg-muted text-muted-foreground",
};

export function SimulationHistory() {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data, isLoading, isFetching, isError, error, refetch } = useSimulationHistory({ cursor });
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
        <span className="text-xs text-status-warning-ink">
          {String((r.result as Record<string, unknown>)?.simulation ?? "")}
        </span>
      ),
    },
  ], [resolveMemberName]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load simulation history"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-3">
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
      />
      {data && (page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      ) : null}
    </div>
  );
}
