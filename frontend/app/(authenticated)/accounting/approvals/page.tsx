"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, ErrorState } from "@/components/shared";
import { AppDialog } from "@/components/shared/app-dialog";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useApprovals,
  useApprovalCounts,
  useApproveRequest,
  useRejectRequest,
} from "@/hooks/api/accounting/settings";
import type { ApprovalRequest, ApprovalStatus } from "@/types/accounting/taxes";
import { cn } from "@/lib/utils";

const RECORD_TYPE_OPTIONS = [
  "All",
  "MANUAL_JOURNAL",
  "PURCHASE_BILL",
  "VENDOR_PAYMENT",
  "EXPENSE",
  "CREDIT_NOTE",
  "PERIOD_REOPEN",
  "BANK_ADJUSTMENT",
] as const;

type RecordTypeFilter = (typeof RECORD_TYPE_OPTIONS)[number];

const STATUS_TABS: ReadonlyArray<{ value: ApprovalStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

interface DecisionDialogProps {
  request: ApprovalRequest;
  action: "approve" | "reject";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function DecisionDialog({ request, action, open, onOpenChange }: DecisionDialogProps) {
  const [comment, setComment] = useState("");
  const approve = useApproveRequest(request.id);
  const reject = useRejectRequest(request.id);
  const isPending = approve.isPending || reject.isPending;

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  function handleConfirm() {
    const payload = { comment: comment || undefined };
    const onSuccess = () => {
      toast.success(action === "approve" ? "Approved" : "Rejected");
      onOpenChange(false);
    };
    const onError = (err: Error) => toast.error(getErrorMessage(err));

    if (action === "approve") {
      approve.mutate(payload, { onSuccess, onError });
    } else {
      reject.mutate(payload, { onSuccess, onError });
    }
  }

  function handleCancel() {
    if (!isPending) onOpenChange(false);
  }

  const isApprove = action === "approve";
  const title = isApprove ? "Approve request" : "Reject request";
  const description = request.recordLabel
    ? `${request.recordType.replace(/_/g, " ")} — ${request.recordLabel}`
    : request.recordType.replace(/_/g, " ");

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={isPending}
            loadingText={isApprove ? "Approving…" : "Rejecting…"}
            onClick={handleConfirm}
            className={cn(isApprove ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {isApprove ? "Approve" : "Reject"}
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Comment (optional)</Label>
          <Textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Add a comment…"
            className="resize-none text-sm"
            rows={3}
          />
        </div>
      </div>
    </AppDialog>
  );
}

interface RowActionsProps {
  request: ApprovalRequest;
  canDecide: boolean;
}

function RowActions({ request, canDecide }: RowActionsProps) {
  const [dialogState, setDialogState] = useState<"approve" | "reject" | null>(null);

  if (!canDecide || request.status !== "PENDING") return null;

  function handleOpenApprove() { setDialogState("approve"); }
  function handleOpenReject() { setDialogState("reject"); }
  function handleCloseDialog(v: boolean) { if (!v) setDialogState(null); }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          onClick={handleOpenApprove}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
          onClick={handleOpenReject}
        >
          Reject
        </Button>
      </div>

      {dialogState && (
        <DecisionDialog
          request={request}
          action={dialogState}
          open={!!dialogState}
          onOpenChange={handleCloseDialog}
        />
      )}
    </>
  );
}

export default function FinanceApprovalsPage() {
  const canRead = useCan("accounting:approvals:read");
  const canDecide = useCan("accounting:approvals:decide");

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL");
  const [recordTypeFilter, setRecordTypeFilter] = useState<RecordTypeFilter>("All");

  const countsQuery = useApprovalCounts();
  const approvalsQuery = useApprovals({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    recordType: recordTypeFilter === "All" ? undefined : recordTypeFilter,
    page: 1,
    pageSize: 100,
  });

  const counts = countsQuery.data;
  const items = approvalsQuery.data?.items ?? [];

  function handleStatusTab(value: ApprovalStatus | "ALL") {
    setStatusFilter(value);
  }

  function handleRetry() {
    void approvalsQuery.refetch();
  }

  if (!canRead) {
    return (
      <PageWrapper title="Finance Approvals" subtitle="Review and approve financial transactions">
        <EmptyState
          illustration={<EmptyApprovalIllustration />}
          title="Access restricted"
          description="You don't have permission to view approvals."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Finance Approvals" subtitle="Review and approve financial transactions">
      <div className="space-y-4">
        <StatCardGrid cols={3}>
          <StatCard
            label="Pending"
            value={counts?.PENDING ?? 0}
            icon={Clock}
            tone="amber"
            isLoading={countsQuery.isLoading}
          />
          <StatCard
            label="Approved"
            value={counts?.APPROVED ?? 0}
            icon={CheckCircle}
            tone="emerald"
            isLoading={countsQuery.isLoading}
          />
          <StatCard
            label="Rejected"
            value={counts?.REJECTED ?? 0}
            icon={XCircle}
            tone="red"
            isLoading={countsQuery.isLoading}
          />
        </StatCardGrid>

        <div className="flex flex-wrap items-center gap-1.5">
          {RECORD_TYPE_OPTIONS.map((rt) => (
            <button
              key={rt}
              onClick={() => setRecordTypeFilter(rt)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                recordTypeFilter === rt
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {rt === "All" ? "All types" : rt.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusTab(tab.value)}
              className={cn(
                "relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                statusFilter === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {statusFilter === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {approvalsQuery.isLoading && <LoadingState variant="table" rows={6} />}

        {approvalsQuery.error && (
          <ErrorState
            title="Failed to load approvals"
            description={getErrorMessage(approvalsQuery.error)}
            onRetry={handleRetry}
          />
        )}

        {!approvalsQuery.isLoading && !approvalsQuery.error && items.length === 0 && (
          <EmptyState
            illustration={<EmptyApprovalIllustration />}
            title="No approvals"
            description="There are no approval requests matching the current filters."
          />
        )}

        {items.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Label</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Requested by</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</TableHead>
                    <TableHead className="w-36 px-2 py-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((req) => (
                    <TableRow key={req.id} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {req.recordType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm px-3 py-2 max-w-[180px] truncate">
                        {req.recordLabel ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums px-3 py-2">
                        {req.recordAmount ? (
                          <Money value={Number(req.recordAmount)} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm px-3 py-2">{req.requesterDisplayName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <FinanceStatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <RowActions request={req} canDecide={canDecide} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
