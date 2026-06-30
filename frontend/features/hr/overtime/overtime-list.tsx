"use client";

import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useOvertimeRequests, useApproveOvertime, useRejectOvertime } from "@/hooks/api/hr/overtime";

interface Props {
  canManage: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function OvertimeList({ canManage }: Props) {
  const { data: requests, isLoading } = useOvertimeRequests();
  const approve = useApproveOvertime();
  const reject = useRejectOvertime();

  function handleApprove(id: number) {
    approve.mutate(id, {
      onSuccess: () => toast.success("Overtime approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleReject(id: number) {
    reject.mutate(id, {
      onSuccess: () => toast.success("Overtime rejected"),
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

  if (!requests?.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-64 gap-3 text-center">
        <Timer className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No overtime requests</p>
        <p className="text-xs text-muted-foreground/70">Submit your first overtime request using the button above</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="text-xs font-semibold">Employee</TableHead>
            <TableHead className="text-xs font-semibold">Date</TableHead>
            <TableHead className="text-xs font-semibold">Hours</TableHead>
            <TableHead className="text-xs font-semibold">Reason</TableHead>
            <TableHead className="text-xs font-semibold">Comp-Off</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            {canManage && <TableHead className="text-xs font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="text-sm">{req.userId}</TableCell>
              <TableCell className="text-sm">{req.date}</TableCell>
              <TableCell className="text-sm font-medium">{req.hours}h</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{req.reason ?? "—"}</TableCell>
              <TableCell>
                {req.convertToCompOff ? (
                  <Badge variant="secondary" className="text-[11px]">Yes</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[req.status] ?? "secondary"} className="text-[11px]">
                  {req.status}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleApprove(req.id)}
                        disabled={approve.isPending || reject.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleReject(req.id)}
                        disabled={approve.isPending || reject.isPending}
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
