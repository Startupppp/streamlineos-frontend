"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useVendors } from "@/hooks/api/inventory/vendors";
import { useGoodsReceipts } from "@/hooks/api/inventory/operations";
import { GrnDetailSheet } from "@/features/inventory/components/procurement/grn-detail-sheet";
import {
  GRN_STATUS_BADGE,
  GRN_STATUS_LABEL,
  type GrnStatus,
} from "@/features/inventory/lib/inventory-status";
import { formatShortDate } from "@/lib/date-utils";
import type { GrnSummary } from "@/hooks/api/inventory/operations";

const RECEIPTS_PERMISSION = "inventory:purchase-orders:read";

const STATUS_OPTIONS: GrnStatus[] = ["DRAFT", "COUNTING", "QUALITY_REVIEW", "POSTED", "CANCELLED"];

function isGrnStatus(value: string): value is GrnStatus {
  return (STATUS_OPTIONS as string[]).includes(value);
}

function isDateString(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const columns: DataTableColumn<GrnSummary>[] = [
  {
    key: "grnNumber",
    header: "GRN #",
    cell: (g) => <span className="font-mono text-dense">{g.grnNumber}</span>,
    sortable: true,
    sortValue: (g) => g.grnNumber,
  },
  {
    key: "status",
    header: "Status",
    cell: (g) => (
      <Badge variant="outline" className={cn("h-5 px-2 py-0.5 text-micro", GRN_STATUS_BADGE[g.status])}>
        {GRN_STATUS_LABEL[g.status]}
      </Badge>
    ),
  },
  {
    key: "poNumber",
    header: "PO #",
    cell: (g) => (
      <span className="font-mono text-dense text-muted-foreground">
        {g.purchaseOrder?.poNumber ?? "—"}
      </span>
    ),
  },
  {
    key: "vendorName",
    header: "Vendor",
    cell: (g) => g.purchaseOrder?.vendor?.name ?? "—",
  },
  {
    key: "receivedDate",
    header: "Received Date",
    cell: (g) => <span className="font-mono tabular-nums">{formatShortDate(g.receivedDate) || "—"}</span>,
    sortable: true,
    sortValue: (g) => g.receivedDate,
  },
  {
    key: "notes",
    header: "Notes",
    cell: (g) => <span className="text-muted-foreground truncate max-w-xs block">{g.notes ?? "—"}</span>,
    className: "hidden md:table-cell",
    headerClassName: "hidden md:table-cell",
  },
];

export default function ReceiptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedGrnId, setSelectedGrnId] = useState<number | null>(null);
  const canView = useCan(RECEIPTS_PERMISSION);

  const vendorParam = searchParams.get("vendor") ?? "all";
  const statusParam = searchParams.get("status") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const resolvedVendorId = vendorParam !== "all" ? Number(vendorParam) : undefined;
  const resolvedStatus = isGrnStatus(statusParam) ? statusParam : undefined;
  /*
   * B10. The SLA dashboard drills through to here carrying its window, and a
   * link whose parameters the destination ignores is worse than no link: the
   * supervisor reads the whole history as though it were the period they were
   * looking at.
   */
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const resolvedDateFrom = isDateString(dateFromParam) ? dateFromParam : undefined;
  const resolvedDateTo = isDateString(dateToParam) ? dateToParam : undefined;

  function updateParams(updates: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "all" || value === "" || (key === "page" && value === "1")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleVendorChange(value: string): void {
    updateParams({ vendor: value, page: "1" });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value, page: "1" });
  }

  function handleClearDates(): void {
    updateParams({ dateFrom: "", dateTo: "", page: "1" });
  }

  function handlePageChange(nextPage: number): void {
    updateParams({ page: String(nextPage) });
  }

  function handleRowClick(grn: GrnSummary): void {
    setSelectedGrnId(grn.id);
  }

  function handleSheetClose(open: boolean): void {
    if (!open) setSelectedGrnId(null);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const vendorsQuery = useVendors({ isActive: true, limit: 100 });
  const query = useGoodsReceipts({
    vendorId: resolvedVendorId,
    status: resolvedStatus,
    dateFrom: resolvedDateFrom,
    dateTo: resolvedDateTo,
    page,
    pageSize: 50,
  });

  const items = query.data?.items ?? [];
  const vendors = vendorsQuery.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const filtersActive =
    resolvedVendorId !== undefined ||
    resolvedStatus !== undefined ||
    resolvedDateFrom !== undefined ||
    resolvedDateTo !== undefined;

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <Select value={statusParam} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 w-fit")}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>{GRN_STATUS_LABEL[status]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {resolvedDateFrom || resolvedDateTo ? (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleClearDates}
        >
          {resolvedDateFrom ?? "…"} to {resolvedDateTo ?? "…"} · clear
        </Button>
      ) : null}
      <Select value={vendorParam} onValueChange={handleVendorChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 max-w-xs")}>
          <SelectValue placeholder="All vendors" />
        </SelectTrigger>
        <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All vendors</SelectItem>
          {vendors.map((v) => (
            <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Receipts"
      subtitle="Deliveries being counted, and the ones already posted to stock."
      filters={canView ? filterBar : undefined}
    >
      {!canView ? (
        <NoPermissionState className="flex-1" permission={RECEIPTS_PERMISSION} />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <DataTable
            data={items}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(g) => g.id}
            isLoading={query.isLoading}
            onRowClick={handleRowClick}
            emptyState={
              query.error ? (
                <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} compact />
              ) : (
                <InventoryEmptyState
                  title={filtersActive ? "No receipts match your filters" : "No receipts found"}
                  description={
                    filtersActive
                      ? "Clear the status or vendor filter to see every delivery."
                      : "Goods receipt notes appear here as soon as a delivery is recorded against a purchase order."
                  }
                  compact
                />
              )
            }
            pagination={
              totalPages > 1
                ? { mode: "server", page, pageSize: 50, total, onPageChange: handlePageChange }
                : undefined
            }
            minWidth="760px"
          />
        </div>
      )}
      <GrnDetailSheet
        grnId={selectedGrnId ?? 0}
        open={selectedGrnId !== null}
        onOpenChange={handleSheetClose}
      />
    </PageWrapper>
  );
}
