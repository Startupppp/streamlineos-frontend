"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  DEAL_APPROVAL_LAYOUT,
  dealApprovalRecordFields,
} from "@/lib/renderer/crm/deal-approval-layout";
import { withDealStages } from "@/lib/renderer/crm/deal-layout";
import { useDealApprovals, useResolveDealApproval } from "@/hooks/api/crm";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { useCan, useCanState } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

/**
 * Deals waiting on somebody's sign-off.
 *
 * No table is written here. The columns, the status badge, the stage badge and
 * the mobile card come from `DEAL_APPROVAL_LAYOUT`; what is left is the one
 * filter this queue has, who may decide, and the decision itself.
 *
 * The rejection reason is a column now. It used to be rendered inside the
 * row-actions slot — the only free space on the row — which meant a rejected
 * request's reason and a pending one's buttons shared a cell and it was cut at
 * thirty characters. A reason is a field of the record, so the description
 * names it and the table gives it a column.
 */

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface PendingDecision {
  readonly id: number;
  readonly action: "approve" | "reject";
}

interface ApprovalRowActionsProps {
  approval: RecordValue;
  onDecide: (decision: PendingDecision) => void;
}

/**
 * A component rather than markup inside the cell callback, so the two handlers
 * are named and belong to the row instead of being rebuilt for every row on
 * every render.
 */
function ApprovalRowActions({ approval, onDecide }: ApprovalRowActionsProps) {
  const id = Number(approval.id);
  const name = typeof approval.dealName === "string" ? approval.dealName : "this deal";

  const handleApprove = useCallback(() => onDecide({ id, action: "approve" }), [id, onDecide]);
  const handleReject = useCallback(() => onDecide({ id, action: "reject" }), [id, onDecide]);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="text-status-success-ink hover:text-status-success-ink"
        aria-label={`Approve ${name}`}
        onClick={handleApprove}
      >
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        aria-label={`Reject ${name}`}
        onClick={handleReject}
      >
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Reject
      </Button>
    </div>
  );
}

export default function DealApprovalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";

  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();
  /*
    `crm:deals:update`, which is what `POST /deals/approvals` actually declares.
    This gated on `crm:deals:approve` — a key that exists in the catalog and
    guards no handler anywhere in the backend, so it got the audience exactly
    backwards: granting it showed the buttons to somebody whose every click
    would 403, while the people who can genuinely resolve an approval never saw
    them at all. The handler additionally requires structural org-admin standing,
    which no key expresses and the client cannot see, so a non-admin holding
    update still gets a refusal — a narrower control than this can draw, but the
    right direction: the guard is the boundary and hiding a control is only UX.
  */
  const canApprove = useCan("crm:deals:update");

  const [decision, setDecision] = useState<PendingDecision | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const tenantLayout = useTenantLayout(DEAL_APPROVAL_LAYOUT);
  const { data: stages } = useCrmStages("deal");
  const layout = useMemo(() => withDealStages(tenantLayout, stages ?? []), [tenantLayout, stages]);

  const { data, isLoading, isError, refetch } = useDealApprovals({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const resolve = useResolveDealApproval();

  const rows = useMemo(
    () => asRecordValues((Array.isArray(data) ? data : []).map(dealApprovalRecordFields)),
    [data],
  );

  const handleFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("status");
      else params.set("status", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleClearFilter = useCallback(() => handleFilterChange("all"), [handleFilterChange]);

  const handleCloseConfirm = useCallback((open: boolean) => {
    if (open) return;
    setDecision(null);
    setRejectionReason("");
  }, []);

  const handleReasonChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(event.target.value),
    [],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleResolve = useCallback(() => {
    if (!decision) return;
    resolve.mutate(
      {
        approvalId: decision.id,
        action: decision.action,
        rejectionReason: decision.action === "reject" ? rejectionReason : undefined,
      },
      {
        onSuccess: () => {
          toast.success(decision.action === "approve" ? "Deal approved" : "Deal rejected");
          setDecision(null);
          setRejectionReason("");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [decision, rejectionReason, resolve]);

  const handleDecide = useCallback((next: PendingDecision) => setDecision(next), []);

  const renderActions = useCallback(
    (row: RecordValue) =>
      canApprove && row.status === "pending" ? (
        <ApprovalRowActions approval={row} onDecide={handleDecide} />
      ) : null,
    [canApprove, handleDecide],
  );

  const isFiltered = statusFilter !== "all";
  const statusFilterLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? statusFilter;

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:deals:read") === "denied")
    return <NoPermissionState permission="crm:deals:read" />;

  return (
    <PageWrapper
      title="Deal approvals"
      subtitle="Deals that need sign-off before they can move"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-40")} aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load approvals"
            description="The approval queue didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyApprovalIllustration />}
            title={isFiltered ? "No approvals match this filter" : "Nothing waiting on you"}
            description={
              isFiltered
                ? `Showing ${statusFilterLabel.toLowerCase()} requests only. Clear the filter to see every one.`
                : "Deals that need sign-off before they can move — a discount past your threshold, say — land here."
            }
            action={isFiltered ? { label: "Clear filter", onClick: handleClearFilter } : undefined}
            actionVariant={isFiltered ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            actions={renderActions}
            density={density}
            money={money}
            minWidth="1000px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <AlertDialog open={decision !== null} onOpenChange={handleCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision?.action === "approve" ? (
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-status-success-ink" />
                  Approve this deal?
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Reject this deal?
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision?.action === "approve"
                ? "This moves the deal to the requested stage."
                : "The requester is told it was rejected, along with your reason."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {decision?.action === "reject" ? (
            <div className="flex flex-col gap-1.5 py-2">
              <label htmlFor="rejection-reason" className="text-label font-medium">
                Rejection reason
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Why is this deal being rejected?"
                value={rejectionReason}
                onChange={handleReasonChange}
                rows={3}
              />
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={resolve.isPending}>
              {resolve.isPending
                ? "Saving…"
                : decision?.action === "approve"
                  ? "Approve"
                  : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
