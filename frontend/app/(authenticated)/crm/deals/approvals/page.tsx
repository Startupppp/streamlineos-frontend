"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useDealApprovals, useResolveDealApproval } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyApprovalIllustration } from "@/components/illustrations";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

interface ApprovalItem {
  id: number;
  status: string;
  dealName?: string | null;
  dealId: number;
  dealValue?: string | number | null;
  requesterName?: string | null;
  requestedStage: string;
  createdAt?: string | null;
  rejectionReason?: string | null;
}

interface ApprovalTableRowProps {
  item: ApprovalItem;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

function ApprovalTableRow({
  item,
  onApprove,
  onReject,
}: ApprovalTableRowProps) {
  const badge = STATUS_BADGE[item.status] ?? {
    label: item.status,
    variant: "secondary" as const,
  };

  const handleApprove = useCallback(
    () => onApprove(item.id),
    [onApprove, item.id],
  );
  const handleReject = useCallback(
    () => onReject(item.id),
    [onReject, item.id],
  );

  return (
    <TableRow key={item.id}>
      <TableCell className="font-medium text-sm">
        {item.dealName ?? `Deal #${item.dealId}`}
      </TableCell>
      <TableCell className="text-right text-sm">
        {item.dealValue ? fmt(item.dealValue) : "—"}
      </TableCell>
      <TableCell className="text-sm">{item.requesterName ?? "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[11px]">
          {item.requestedStage}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant} className="text-[11px]">
          {badge.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.createdAt ? format(new Date(item.createdAt), "dd MMM yyyy") : "—"}
      </TableCell>
      <TableCell className="text-right">
        {item.status === "pending" && (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-green-600 hover:text-green-700"
              onClick={handleApprove}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleReject}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
          </div>
        )}
        {item.status === "rejected" && item.rejectionReason && (
          <span
            className="text-xs text-muted-foreground italic"
            title={item.rejectionReason}
          >
            {item.rejectionReason.slice(0, 30)}
            {item.rejectionReason.length > 30 ? "..." : ""}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function ApprovalsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-20 ml-auto" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-7 w-28 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function DealApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    "pending",
  );
  const [confirmAction, setConfirmAction] = useState<{
    id: number;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { data, isLoading, isError, refetch } = useDealApprovals({
    status: statusFilter,
  });
  const resolve = useResolveDealApproval();

  const items = Array.isArray(data) ? data : [];

  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value === "all" ? undefined : value);
  }, []);

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
            confirmAction.action === "approve"
              ? "Deal approved"
              : "Deal rejected",
          );
          setConfirmAction(null);
          setRejectionReason("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [confirmAction, rejectionReason, resolve]);

  const filterTabs = (
    <Tabs value={statusFilter ?? "all"} onValueChange={handleFilterChange}>
      <TabsList className="h-8">
        <TabsTrigger value="pending" className="text-xs px-3 h-7">
          Pending
        </TabsTrigger>
        <TabsTrigger value="approved" className="text-xs px-3 h-7">
          Approved
        </TabsTrigger>
        <TabsTrigger value="rejected" className="text-xs px-3 h-7">
          Rejected
        </TabsTrigger>
        <TabsTrigger value="all" className="text-xs px-3 h-7">
          All
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <PageWrapper
      title="Deal Approvals"
      subtitle="Review and approve high-value deals"
      filters={filterTabs}
    >
      {isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load approvals.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading ? (
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[750px]">
                <ApprovalsTableSkeleton />
              </div>
            </ScrollArea>
          ) : items.length === 0 ? (
            <EmptyState
              illustration={<EmptyApprovalIllustration className="h-32 w-32" />}
              title="No approvals found"
              description="There are no deal approvals matching the current filter."
            />
          ) : (
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[750px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a) => (
                      <ApprovalTableRow
                        key={a.id}
                        item={a}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={handleCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approve" ? (
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-green-600" /> Approve
                  Deal?
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" /> Reject Deal?
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
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="Why is this deal being rejected?"
                value={rejectionReason}
                onChange={handleReasonChange}
                rows={3}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={resolve.isPending}
            >
              {resolve.isPending
                ? "Processing..."
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
