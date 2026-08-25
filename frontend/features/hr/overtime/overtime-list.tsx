"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOvertimeRequests({ page, pageSize: PAGE_SIZE });
  const requests = data?.items;
  const approve = useApproveOvertime();
  const reject = useRejectOvertime();

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
                className="text-xs"
                onClick={() => handleApprove(req.id)}
                disabled={reject.isPending}
                isPending={approve.isPending}
              >
                Approve
              </LoadingButton>
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => handleReject(req.id)}
                disabled={approve.isPending}
                isPending={reject.isPending}
              >
                Reject
              </LoadingButton>
            </div>
          ) : null,
      });
    }

    return cols;
  }, [canManage, approve.isPending, reject.isPending, memberById, handleApprove, handleReject]);

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={requests ?? []}
      columns={columns}
      getRowKey={(req) => req.id}
      isLoading={isLoading}
      pagination={{
        mode: "server",
        page,
        pageSize: PAGE_SIZE,
        total: data?.total ?? 0,
        onPageChange: setPage,
      }}
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
  );
}
