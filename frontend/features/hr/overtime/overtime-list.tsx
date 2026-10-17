"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOvertimeRequests, useApproveOvertime, useRejectOvertime } from "@/hooks/api/hr/overtime";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

interface Props {
  canManage: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

const PAGE_SIZE = 20;

export function OvertimeList({ canManage }: Props) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursorHistory.at(-1);
  const page = cursorHistory.length;
  const { data, isLoading, isFetching, isError, error, refetch } = useOvertimeRequests({ cursor, pageSize: PAGE_SIZE });
  const requests = data?.items;
  const approve = useApproveOvertime();
  const reject = useRejectOvertime();
  // One decision in flight disables that row only, not every row.
  const busyId = approve.isPending ? approve.variables : reject.isPending ? reject.variables : undefined;

  const userIds = useMemo(
    () => [...new Set((requests ?? []).map((r) => r.userId))],
    [requests],
  );
  const { data: membersData } = useOrgMembersByIds(userIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const handleApprove = useCallback((id: number) => {
    approve.mutate(id, {
      onSuccess: () => toast.success("Overtime approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [approve]);

  const handleReject = useCallback((id: number) => {
    reject.mutate(id, {
      onSuccess: () => toast.success("Overtime rejected"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [reject]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor)
      setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  type OvertimeRequest = NonNullable<typeof requests>[number];

  const columns = useMemo<DataTableColumn<OvertimeRequest>[]>(() => {
    const cols: DataTableColumn<OvertimeRequest>[] = [
      {
        key: "userId",
        header: "Employee",
        cell: (req) => <span className="text-sm">{getUserDisplayName(memberById.get(req.userId))}</span>,
      },
      {
        key: "date",
        header: "Date",
        cell: (req) => <span className="text-sm">{req.date}</span>,
      },
      {
        key: "hours",
        header: "Hours",
        cell: (req) => <span className="text-sm font-medium">{req.hours}h</span>,
      },
      {
        key: "reason",
        header: "Reason",
        cell: (req) => (
          <TruncatedText text={req.reason ?? "—"} className="text-sm text-muted-foreground max-w-[200px]" />
        ),
      },
      {
        key: "convertToCompOff",
        header: "Comp-Off",
        cell: (req) =>
          req.convertToCompOff ? (
            <Badge variant="secondary" className="text-dense">Yes</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),
      },
      {
        key: "status",
        header: "Status",
        cell: (req) => (
          <Badge variant={STATUS_VARIANTS[req.status] ?? "secondary"} className="text-dense">
            {req.status}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      cols.push({
        key: "actions",
        header: "Actions",
        cell: (req): ReactNode =>
          req.status === "PENDING" ? (
            <div className="flex items-center gap-2">
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={() => handleApprove(req.id)}
                disabled={busyId === req.id}
                isPending={approve.isPending && approve.variables === req.id}
              >
                Approve
              </LoadingButton>
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleReject(req.id)}
                disabled={busyId === req.id}
                isPending={reject.isPending && reject.variables === req.id}
              >
                Reject
              </LoadingButton>
            </div>
          ) : null,
      });
    }

    return cols;
  }, [canManage, busyId, approve.isPending, approve.variables, reject.isPending, reject.variables, memberById, handleApprove, handleReject]);

  // useOvertimeRequests is gated on hr:attendance:view and the route has no
  // guard: a denied caller read "No overtime requests" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
        {null}
      </PageState>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={requests ?? []}
        columns={columns}
        getRowKey={(req) => req.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustrationPreset="approval"
            title="No overtime requests"
            description="Submit your first overtime request using the button above"
            className="border-0 bg-transparent shadow-none h-64"
            compact
          />
        }
      />
      <CursorPageControls
        page={page}
        hasNext={data?.pagination.hasMore ?? false}
        disabled={isFetching}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
      />
    </div>
  );
}
