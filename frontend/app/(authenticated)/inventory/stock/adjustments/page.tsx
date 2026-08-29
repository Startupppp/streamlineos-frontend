"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyActivityIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import {
  useAdjustments,
  type AdjustmentListItem,
  type AdjustmentReason,
} from "@/hooks/api/inventory/stock";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  ADJUSTMENT_STATUS_BADGE,
  ADJUSTMENT_STATUS_LABEL,
  type AdjustmentStatus,
} from "@/features/inventory/lib";
import { AdjustmentDetailSheet } from "@/features/inventory/components/stock/adjustment-detail-sheet";
import { CreateAdjustmentSheet } from "@/features/inventory/components/stock/create-adjustment-sheet";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared";

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase", SALE: "Sale", RETURN: "Return", DAMAGE: "Damage",
  EXPIRY: "Expiry", THEFT: "Theft / Loss", RECOUNT: "Recount", OTHER: "Other",
  SCRAP: "Scrap / Write-off",
};
const REASON_BADGE: Record<AdjustmentReason, string> = {
  DAMAGE: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  EXPIRY: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  THEFT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  RETURN: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  SCRAP: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  RECOUNT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PURCHASE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  SALE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  OTHER: "bg-muted text-muted-foreground border-border",
};
const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER", "SCRAP"];
const ADJ_STATUSES: AdjustmentStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "CANCELLED"];

const ADJUSTMENT_COLUMNS: DataTableColumn<AdjustmentListItem>[] = [
  {
    key: "referenceNumber",
    header: "Ref #",
    className: "font-mono text-dense font-semibold text-primary",
    cell: (row) => <span>{row.referenceNumber}</span>,
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0 font-medium", REASON_BADGE[row.reason])}>
        {REASON_LABELS[row.reason]}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn("h-4 text-micro px-1.5 py-0 font-medium", ADJUSTMENT_STATUS_BADGE[row.status])}
      >
        {ADJUSTMENT_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "lineCount",
    header: "Lines",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-medium",
    cell: (row) => <span>{row.lineCount}</span>,
  },
  {
    key: "createdByName",
    header: "Created By",
    className: "text-muted-foreground",
    cell: (row) => <span>{row.createdByName ?? "—"}</span>,
  },
  {
    key: "createdAt",
    header: "Date",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => <span>{format(new Date(row.createdAt), "dd MMM yyyy")}</span>,
  },
];

export default function AdjustmentsPage() {
  const canView = useCan("inventory:stock:read");
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQ = searchParams.get("q") ?? "";
  const reasonFilter = searchParams.get("reason") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";

  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: adjData, isLoading, isError, refetch } = useAdjustments({
    page,
    limit: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
    // Server-side: filtering one page of rows in the browser hid every match
    // that happened to fall on page two, and the count under the filter was the
    // unfiltered total.
    reason: reasonFilter !== "all" && reasonFilter !== "write-offs" ? reasonFilter : undefined,
    writeOffsOnly: reasonFilter === "write-offs" ? true : undefined,
  });

  const adjustments = useMemo(() => {
    const result: AdjustmentListItem[] = adjData?.items ?? [];
    if (!searchQ) return result;
    const q = searchQ.toLowerCase();
    return result.filter(
      (a) =>
        a.referenceNumber.toLowerCase().includes(q) ||
        (a.createdByName?.toLowerCase().includes(q) ?? false),
    );
  }, [adjData?.items, searchQ]);

  const handleReasonChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("reason");
      else params.set("reason", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStatusChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("status");
      else params.set("status", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleOpenSheet(): void {
    setSheetOpen(true);
  }
  function handleRetry(): void { void refetch(); }

  function handleRowClick(adj: AdjustmentListItem): void {
    setDetailId(adj.id);
    setDetailOpen(true);
  }

  function handleSearchChange(val: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("q", val);
    else params.delete("q");
    params.delete("page");
    setPage(1);
    router.replace(`?${params.toString()}`);
  }

  const hasActiveFilters = searchQ || reasonFilter !== "all" || statusFilter !== "all";

  if (!canView)
    return (
      <PageWrapper
        title="Stock Adjustments"
        subtitle="Create and review inventory quantity corrections."
      >
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Stock Adjustments"
      subtitle="Create and review inventory quantity corrections."
      actions={
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" className="text-xs" onClick={handleOpenSheet}>
          New Adjustment
        </AnimatedIconButton>
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={reasonFilter} onValueChange={handleReasonChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] text-xs")}>
              <SelectValue placeholder="All reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              <SelectItem value="write-offs">Write-offs only</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] text-xs")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ADJ_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ADJUSTMENT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {isError ? (
        <ErrorState
          title="Failed to load adjustments"
          description="An error occurred while fetching adjustment records."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : adjustments.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          <InventoryEmptyState
            illustration={hasActiveFilters ? <EmptySearchIllustration /> : <EmptyActivityIllustration />}
            title={hasActiveFilters ? "No results" : "No adjustments yet"}
            description={
              hasActiveFilters
                ? "No adjustments match your filters."
                : "Create a stock adjustment to correct on-hand quantities."
            }
            action={
              hasActiveFilters
                ? { label: "Clear Filters", href: "?" }
                : { label: "New Adjustment", onClick: handleOpenSheet }
            }
            className="flex-1"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
            <DataTable
              className="flex-1 min-h-0"
              data={adjustments}
              columns={ADJUSTMENT_COLUMNS}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              pagination={{
                mode: "server",
                page,
                pageSize: 20,
                total: adjData?.total ?? 0,
                onPageChange: setPage,
              }}
              search={{
                value: searchQ,
                onChange: handleSearchChange,
                placeholder: "Search by ref or creator…",
              }}
            />
          </motion.div>
        </motion.div>
      )}
      </div>

      <CreateAdjustmentSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <AdjustmentDetailSheet
        adjustmentId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageWrapper>
  );
}
