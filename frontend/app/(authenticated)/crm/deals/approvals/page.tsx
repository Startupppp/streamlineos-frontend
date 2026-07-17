"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { useDealApprovals, useResolveDealApproval } from "@/hooks/api/crm";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyApprovalIllustration } from "@/components/illustrations";

type ApprovalRow = NonNullable<ReturnType<typeof useDealApprovals>["data"]>[number];

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
};

interface ApprovalRowActionsProps {
  item: ApprovalRow;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

function ApprovalRowActions({ item, onApprove, onReject }: ApprovalRowActionsProps) {
  const canApprove = useCan("crm:deals:approve");
  const handleApproveClick = useCallback(() => onApprove(item.id), [item.id, onApprove]);
  const handleRejectClick = useCallback(() => onReject(item.id), [item.id, onReject]);

  if (item.status === "pending") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {canApprove && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              onClick={handleApproveClick}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive"
              onClick={handleRejectClick}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
          </>
        )}
      </div>
    );
  }

  if (item.status === "rejected" && item.rejectionReason) {
    return (
      <span
        className="text-xs text-muted-foreground italic truncate block max-w-[120px]"
        title={item.rejectionReason}
      >
        {item.rejectionReason.slice(0, 30)}
        {item.rejectionReason.length > 30 ? "…" : ""}
      </span>
    );
  }

  return null;
}

export default function DealApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";

  const [confirmAction, setConfirmAction] = useState<{
    id: number;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, isError, refetch } = useDealApprovals({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const resolve = useResolveDealApproval();

  const items: ApprovalRow[] = Array.isArray(data) ? data : [];

  const handleFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleOpenConfirm = useCallback(
    (id: number, action: "approve" | "reject") => {
      setConfirmAction({ id, action });
    },
    [],
  );

  const handleCloseConfirm = useCallback((open: boolean) => {
    if (!open) {
      setConfirmAction(null);
      setRejectionReason("");
    }
  }, []);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectionReason(e.target.value);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleApprove = useCallback(
    (id: number) => handleOpenConfirm(id, "approve"),
    [handleOpenConfirm],
  );

  const handleReject = useCallback(
    (id: number) => handleOpenConfirm(id, "reject"),
    [handleOpenConfirm],
  );

  const handleResolve = useCallback(() => {
    if (!confirmAction) return;
    resolve.mutate(
      {
        approvalId: confirmAction.id,
        action: confirmAction.action,
        rejectionReason:
          confirmAction.action === "reject" ? rejectionReason : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            confirmAction.action === "approve" ? "Deal approved" : "Deal rejected",
          );
          setConfirmAction(null);
          setRejectionReason("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [confirmAction, rejectionReason, resolve]);

  const handleClearFilter = useCallback(() => handleFilterChange("all"), [handleFilterChange]);

  const columns = useMemo<DataTableColumn<ApprovalRow>[]>(
    () => [
      {
        key: "dealName",
        header: "Deal",
        sortable: true,
        sortValue: (r) => r.dealName ?? "",
        cell: (r) => (
          <TruncatedText text={r.dealName ?? `Deal #${r.dealId}`} className="font-medium max-w-[180px] block" />
        ),
      },
      {
        key: "dealValue",
        header: "Value",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        sortable: true,
        sortValue: (r) => Number(r.dealValue ?? 0),
        cell: (r) => (r.dealValue ? fmt(r.dealValue) : "—"),
      },
      {
        key: "requesterName",
        header: "Requester",
        cell: (r) => r.requesterName ?? "—",
      },
      {
        key: "requestedStage",
        header: "Stage",
        cell: (r) => (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border"
          >
            {r.requestedStage}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => {
          const badge = STATUS_BADGE[r.status];
          return (
            <Badge
              variant="outline"
              className={cn("text-[9px] h-4 px-1.5 py-0", badge?.className)}
            >
              {badge?.label ?? r.status}
            </Badge>
          );
        },
      },
      {
        key: "createdAt",
        header: "Created",
        className: "font-mono tabular-nums",
        cell: (r) =>
          r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "—",
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-40",
        cell: (r) => (
          <ApprovalRowActions item={r} onApprove={handleApprove} onReject={handleReject} />
        ),
      },
    ],
    [handleApprove, handleReject],
  );

  const filterBar = (
    <div className="flex w-full min-w-0 items-center gap-2">
      <Select value={statusFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="text-xs w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Deal Approvals"
      subtitle="Review and approve high-value deals"
      filters={filterBar}
    >
      {isError ? (
        <ErrorState
          title="Failed to load approvals"
          description="An error occurred while loading deal approvals."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(r) => r.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              illustration={<EmptyApprovalIllustration />}
              title="No approvals found"
              description="There are no deal approvals matching the current filter."
              action={{ label: "Clear filter", onClick: handleClearFilter }}
              className="border-0 bg-transparent min-h-[40vh]"
            />
          }
          minWidth="720px"
          className="flex-1 min-h-0"
        />
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={handleCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approve" ? (
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Approve Deal?
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Reject Deal?
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "approve"
                ? "This will move the deal to the requested stage."
                : "The requester will be notified of the rejection."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.action === "reject" && (
            <div className="space-y-1.5 py-2">
              <label htmlFor="rejection-reason" className="text-[13px] font-medium">
                Rejection Reason
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Why is this deal being rejected?"
                value={rejectionReason}
                onChange={handleReasonChange}
                rows={3}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={resolve.isPending}>
              {resolve.isPending
                ? "Processing…"
                : confirmAction?.action === "approve"
                  ? "Approve"
                  : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
