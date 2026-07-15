"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { EmptyActivityIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase", SALE: "Sale", RETURN: "Return", DAMAGE: "Damage",
  EXPIRY: "Expiry", THEFT: "Theft / Loss", RECOUNT: "Recount", OTHER: "Other",
};
const REASON_BADGE: Record<AdjustmentReason, string> = {
  DAMAGE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  EXPIRY: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  THEFT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  RETURN: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  RECOUNT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PURCHASE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  SALE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  OTHER: "bg-muted text-muted-foreground border-border",
};
const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"];
const ADJ_STATUSES: AdjustmentStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "CANCELLED"];

const ADJUSTMENT_COLUMNS: DataTableColumn<AdjustmentListItem>[] = [
  {
    key: "referenceNumber",
    header: "Ref #",
    className: "font-mono text-[11px] font-semibold text-primary",
    cell: (row) => <span>{row.referenceNumber}</span>,
  },
  {
    key: "reason",
    header: "Reason",
    cell: (row) => (
      <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0 font-medium", REASON_BADGE[row.reason])}>
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
        className={cn("h-4 text-[9px] px-1.5 py-0 font-medium", ADJUSTMENT_STATUS_BADGE[row.status])}
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
  });

  const adjustments = useMemo(() => {
    let result: AdjustmentListItem[] = adjData?.items ?? [];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (a) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          (a.createdByName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (reasonFilter !== "all") {
      result = result.filter((a) => a.reason === reasonFilter);
    }
    return result;
  }, [adjData?.items, searchQ, reasonFilter]);

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

  const subtitle = adjData?.total != null
    ? `${adjData.total} adjustment${adjData.total !== 1 ? "s" : ""}`
    : undefined;

  const hasActiveFilters = searchQ || reasonFilter !== "all" || statusFilter !== "all";

  return (
    <PageWrapper
      title="Stock Adjustments"
      subtitle={subtitle}
      actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Adjustment
        </Button>
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <Select value={reasonFilter} onValueChange={handleReasonChange}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue placeholder="All reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px] text-xs">
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
      {isError ? (
        <ErrorState
          title="Failed to load adjustments"
          description="An error occurred while fetching adjustment records."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : adjustments.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
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

      <CreateAdjustmentSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <AdjustmentDetailSheet
        adjustmentId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageWrapper>
  );
}
