"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!swaps?.length) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        title="No swap requests"
        description="Shift swap requests from employees will appear here"
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
            <TableHead className="text-xs font-semibold">Requester</TableHead>
            <TableHead className="text-xs font-semibold">Target Employee</TableHead>
            <TableHead className="text-xs font-semibold">Request Date</TableHead>
            <TableHead className="text-xs font-semibold">Target Date</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            {canManage && <TableHead className="text-xs font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {swaps.map((swap) => (
            <TableRow key={swap.id}>
              <TableCell className="text-sm">{swap.requesterId}</TableCell>
              <TableCell className="text-sm">{swap.targetUserId}</TableCell>
              <TableCell className="text-sm">{swap.requestDate}</TableCell>
              <TableCell className="text-sm">{swap.targetDate}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[swap.status] ?? "secondary"} className="text-[11px]">
                  {swap.status}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  {swap.status === "PENDING" && (
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
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
