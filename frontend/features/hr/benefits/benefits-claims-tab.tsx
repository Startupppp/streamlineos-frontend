"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { ClaimReviewSheet } from "@/features/hr/benefits/claim-review-sheet";
import { useInsuranceClaims, type InsuranceClaim } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";

interface BenefitsClaimsTabProps {
  canManage: boolean;
}

const CLAIM_STATUS_META: Record<InsuranceClaim["status"], { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  in_review: { label: "In Review", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  approved: { label: "Approved", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  rejected: { label: "Rejected", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  paid: { label: "Paid", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
};

function buildClaimColumns(canManage: boolean, onReview: (claim: InsuranceClaim) => void, money: MoneyDisplay): DataTableColumn<InsuranceClaim>[] {
  const columns: DataTableColumn<InsuranceClaim>[] = [
    { key: "claimNumber", header: "Claim #", cell: (claim) => <span className="text-xs font-mono">{claim.claimNumber}</span> },
    { key: "claimant", header: "Claimant", cell: (claim) => <span className="text-sm">{claim.user?.name ?? claim.user?.email ?? "Unknown user"}</span> },
    { key: "plan", header: "Plan", cell: (claim) => <span className="text-xs text-muted-foreground">{claim.plan?.name ?? `Plan #${claim.planId}`}</span> },
    { key: "amount", header: "Amount", cell: (claim) => <span className="text-sm font-medium tabular-nums">{formatMoney(claim.amountCents / 100, money)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (claim) => {
        const meta = CLAIM_STATUS_META[claim.status];
        return <Badge variant="outline" className={cn("text-micro", meta.className)}>{meta.label}</Badge>;
      },
    },
    { key: "payoutRoute", header: "Payout Route", cell: (claim) => <span className="text-xs text-muted-foreground capitalize">{claim.payoutRoute?.replace(/_/g, " ") ?? "—"}</span> },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "w-20",
      cell: (claim) => {
        if (claim.status !== "submitted" && claim.status !== "in_review") return null;
        function handleReviewClick(event: MouseEvent<HTMLButtonElement>) {
          event.stopPropagation();
          onReview(claim);
        }
        return <Button size="sm" variant="ghost" className="text-xs" onClick={handleReviewClick}>Review</Button>;
      },
    });
  }
  return columns;
}

export function BenefitsClaimsTab({ canManage }: BenefitsClaimsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [reviewClaim, setReviewClaim] = useState<InsuranceClaim | null>(null);
  const query = {
    ...(statusFilter !== "all" ? { status: statusFilter as InsuranceClaim["status"] } : {}),
    cursor: cursors[cursorIndex] ?? undefined,
  };
  const { data, isLoading, isFetching, isError, error, refetch } = useInsuranceClaims(query);
  const money = useOrgDisplay();
  const pageState = usePageState({ permission: "hr:benefits:view", module: "hr", isLoading, isError, error });
  const handleStatusFilterChange = useCallback((value: string) => { setStatusFilter(value); setCursors([null]); setCursorIndex(0); }, []);
  const handleReviewClaim = useCallback((claim: InsuranceClaim) => { setReviewClaim(claim); }, []);
  const handleReviewSheetOpenChange = useCallback((open: boolean) => { if (!open) setReviewClaim(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleClearFilters = useCallback(() => { setStatusFilter("all"); setCursors([null]); setCursorIndex(0); }, []);
  const filtersActive = statusFilter !== "all";

  function handlePreviousPage() {
    setCursorIndex((current) => Math.max(0, current - 1));
  }

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursors((current) => [...current.slice(0, cursorIndex + 1), nextCursor]);
    setCursorIndex((current) => current + 1);
  }


  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className={cn("w-40", FILTER_SELECT_TRIGGER)}><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <PageState resolution={pageState} loading={<LoadingState variant="table" />} onRetry={handleRetry} className="flex-1">
      <DataTable<InsuranceClaim>
        className="flex-1 min-h-0"
        data={data?.data ?? []}
        columns={buildClaimColumns(canManage, handleReviewClaim, money)}
        getRowKey={(claim) => claim.id}
        emptyState={
          <EmptyState
            illustrationPreset="documents"
            title="No claims yet"
            description={filtersActive ? undefined : "Insurance claims submitted by employees will appear here."}
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
            className={CONTENT_FILL_PANEL}
          />
        }
      />
      </PageState>
      {cursorIndex > 0 || data?.pagination.hasMore ? <CursorPageControls page={cursorIndex + 1} hasNext={data?.pagination.hasMore ?? false} disabled={isFetching} onPrevious={handlePreviousPage} onNext={handleNextPage} /> : null}
      <ClaimReviewSheet open={reviewClaim !== null} onOpenChange={handleReviewSheetOpenChange} claim={reviewClaim} />
    </div>
  );
}
