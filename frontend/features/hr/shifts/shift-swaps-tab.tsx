"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useShiftSwaps, useUpdateSwapStatus } from "@/hooks/api/hr/shifts";
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

export function ShiftSwapsTab({ canManage }: Props) {
  const { data: swaps, isLoading, isError, error, refetch } = useShiftSwaps();
  const updateStatus = useUpdateSwapStatus();

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const swap of swaps ?? []) {
      ids.add(swap.requesterId);
      ids.add(swap.targetUserId);
    }
    return [...ids];
  }, [swaps]);
  const { data: membersData } = useOrgMembersByIds(userIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // One swap in flight must not spin every row's buttons.
  const pendingSwapId = updateStatus.isPending ? updateStatus.variables?.swapId : undefined;

  const handleApprove = useCallback((id: number) => {
    updateStatus.mutate({ swapId: id, status: "APPROVED" }, {
      onSuccess: () => toast.success("Swap request approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [updateStatus]);

  const handleReject = useCallback((id: number) => {
    updateStatus.mutate({ swapId: id, status: "REJECTED" }, {
      onSuccess: () => toast.success("Swap request rejected"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [updateStatus]);

  type Swap = NonNullable<typeof swaps>[number];

  const columns = useMemo<DataTableColumn<Swap>[]>(() => {
    const cols: DataTableColumn<Swap>[] = [
      {
        key: "requesterId",
        header: "Requester",
        cell: (swap) => <span className="text-sm">{getUserDisplayName(memberById.get(swap.requesterId))}</span>,
      },
      {
        key: "targetUserId",
        header: "Target Employee",
        cell: (swap) => <span className="text-sm">{getUserDisplayName(memberById.get(swap.targetUserId))}</span>,
      },
      {
        key: "requestDate",
        header: "Request Date",
        cell: (swap) => <span className="text-sm">{swap.requestDate}</span>,
      },
      {
        key: "targetDate",
        header: "Target Date",
        cell: (swap) => <span className="text-sm">{swap.targetDate}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (swap) => (
          <Badge variant={STATUS_VARIANTS[swap.status] ?? "secondary"} className="text-dense">
            {swap.status}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      cols.push({
        key: "actions",
        header: "Actions",
        cell: (swap): ReactNode =>
          swap.status === "PENDING" ? (
            <div className="flex items-center gap-2">
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={() => handleApprove(swap.id)}
                isPending={pendingSwapId === swap.id && updateStatus.variables?.status === "APPROVED"}
                disabled={pendingSwapId === swap.id}
              >
                Approve
              </LoadingButton>
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleReject(swap.id)}
                isPending={pendingSwapId === swap.id && updateStatus.variables?.status === "REJECTED"}
                disabled={pendingSwapId === swap.id}
              >
                Reject
              </LoadingButton>
            </div>
          ) : null,
      });
    }

    return cols;
  }, [canManage, pendingSwapId, updateStatus.variables?.status, memberById, handleApprove, handleReject]);

  // No route guard; the read is gated on hr:attendance:view, so a denied
  // caller must be told so, not "No swap requests" (FE-47).
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
      data={swaps ?? []}
      columns={columns}
      getRowKey={(swap) => swap.id}
      isLoading={isLoading}
      pagination={{ pageSize: 25 }}
      emptyState={
        <EmptyState
          illustrationPreset="calendar"
          title="No swap requests"
          description="Shift swap requests from employees will appear here"
          className="border-0 bg-transparent shadow-none h-64"
          compact
        />
      }
    />
  );
}
