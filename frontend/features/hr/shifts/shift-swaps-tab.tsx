"use client";

import { useMemo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { useShiftSwaps, useUpdateSwapStatus } from "@/hooks/api/hr/shifts";

interface Props {
  canManage: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function ShiftSwapsTab({ canManage }: Props) {
  const { data: swaps, isLoading } = useShiftSwaps();
  const updateStatus = useUpdateSwapStatus();

  function handleApprove(id: number) {
    updateStatus.mutate({ id, status: "APPROVED" }, {
      onSuccess: () => toast.success("Swap request approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleReject(id: number) {
    updateStatus.mutate({ id, status: "REJECTED" }, {
      onSuccess: () => toast.success("Swap request rejected"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  type Swap = NonNullable<typeof swaps>[number];

  const columns = useMemo<DataTableColumn<Swap>[]>(() => {
    const cols: DataTableColumn<Swap>[] = [
      {
        key: "requesterId",
        header: "Requester",
        cell: (swap) => <span className="text-sm">{swap.requesterId}</span>,
      },
      {
        key: "targetUserId",
        header: "Target Employee",
        cell: (swap) => <span className="text-sm">{swap.targetUserId}</span>,
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
          <Badge variant={STATUS_VARIANTS[swap.status] ?? "secondary"} className="text-[11px]">
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
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleApprove(swap.id)}
                disabled={updateStatus.isPending}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleReject(swap.id)}
                disabled={updateStatus.isPending}
              >
                Reject
              </Button>
            </div>
          ) : null,
      });
    }

    return cols;
  }, [canManage, updateStatus.isPending]);

  return (
    <DataTable
      data={swaps ?? []}
      columns={columns}
      getRowKey={(swap) => swap.id}
      isLoading={isLoading}
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
