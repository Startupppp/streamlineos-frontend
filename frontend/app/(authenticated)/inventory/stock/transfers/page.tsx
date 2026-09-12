"use client";

import { useState, useCallback, useMemo, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyTransferIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useMotionVariants } from "@/lib/motion-variants";
import { useTransfers, type TransferStatus } from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { NewTransferSheet } from "@/features/inventory/components/stock/new-transfer-sheet";
import {
  TRANSFER_STATUS_BADGE,
  TRANSFER_STATUS_LABEL,
} from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared";

const ALL_STATUSES: TransferStatus[] = ["PENDING", "RESERVED", "IN_TRANSIT", "COMPLETED", "CANCELLED"];

function isTransferStatus(s: string): s is TransferStatus {
  return (ALL_STATUSES as string[]).includes(s);
}

const LIMIT = 20;

type TransferRow = {
  id: number;
  referenceNumber: string;
  fromLocationName: string | null | undefined;
  toLocationName: string | null | undefined;
  lineCount: number;
  status: TransferStatus;
  createdAt: string;
};

function buildTransferColumns(
  onView: (id: number) => void,
): DataTableColumn<TransferRow>[] {
  return [
    {
      key: "referenceNumber",
      header: "Ref #",
      cell: (row) => (
        <Link
          href={`/inventory/stock/transfers/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-dense font-semibold text-primary hover:underline"
        >
          {row.referenceNumber}
        </Link>
      ),
    },
    {
      key: "fromLocationName",
      header: "From",
      cell: (row) => <span className="text-muted-foreground">{row.fromLocationName ?? "—"}</span>,
    },
    {
      key: "toLocationName",
      header: "To",
      cell: (row) => <span className="text-muted-foreground">{row.toLocationName ?? "—"}</span>,
    },
    {
      key: "lineCount",
      header: "Lines",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (row) => <span>{row.lineCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0 font-medium", TRANSFER_STATUS_BADGE[row.status])}
        >
          {TRANSFER_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (row) => {
        function handleViewClick(e: MouseEvent): void {
          e.stopPropagation();
          onView(row.id);
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-dense text-primary hover:text-primary/80"
            onClick={handleViewClick}
            aria-label={`View transfer ${row.referenceNumber}`}
          >
            View
          </Button>
        );
      },
    },
  ];
}

export default function TransfersPage() {
  const canView = useCan("inventory:stock:read");
  const { staggerContainer, fadeUp } = useMotionVariants();
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") ?? "all";
  const searchQ = searchParams.get("q") ?? "";
  const fromWarehouseParam = searchParams.get("fromWarehouse") ?? "";
  const toWarehouseParam = searchParams.get("toWarehouse") ?? "";
  const fromDateParam = searchParams.get("fromDate") ?? "";
  const toDateParam = searchParams.get("toDate") ?? "";

  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const statusFilter = statusParam !== "all" && isTransferStatus(statusParam) ? statusParam : undefined;
  const fromWarehouseFilter = fromWarehouseParam ? Number(fromWarehouseParam) : undefined;
  const toWarehouseFilter = toWarehouseParam ? Number(toWarehouseParam) : undefined;

  const { data: transfersData, isLoading, isError, refetch } = useTransfers({
    status: statusFilter,
    search: searchQ || undefined,
    fromWarehouseId: fromWarehouseFilter,
    toWarehouseId: toWarehouseFilter,
    fromDate: fromDateParam || undefined,
    toDate: toDateParam || undefined,
    page,
    limit: LIMIT,
  });

  const { data: warehousesResponse } = useWarehouses();
  const warehouses = warehousesResponse?.items ?? [];

  const warehouseOptions = useMemo<ComboboxOption[]>(
    () => warehouses.map((w) => ({ value: String(w.id), label: w.name, sublabel: w.code })),
    [warehouses],
  );

  const total = transfersData?.total ?? 0;
  const transfers = transfersData?.items ?? [];

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStatusChange = useCallback(
    (val: string) => updateParams({ status: val === "all" ? undefined : val }),
    [updateParams],
  );

  const handleFromWarehouseChange = useCallback(
    (val: string) => updateParams({ fromWarehouse: val || undefined }),
    [updateParams],
  );

  const handleToWarehouseChange = useCallback(
    (val: string) => updateParams({ toWarehouse: val || undefined }),
    [updateParams],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) =>
      updateParams({ fromDate: range.from || undefined, toDate: range.to || undefined }),
    [updateParams],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  function handleRetry(): void {
    void refetch();
  }

  function handleSearchChange(val: string): void {
    updateParams({ q: val || undefined });
  }

  function handleRowClick(row: TransferRow): void {
    router.push(`/inventory/stock/transfers/${row.id}`);
  }

  const handleView = useCallback(
    (id: number): void => {
      router.push(`/inventory/stock/transfers/${id}`);
    },
    [router],
  );

  const handleClearFilters = useCallback(() => {
    setPage(1);
    router.replace("?");
  }, [router]);

  const hasActiveFilters =
    !!searchQ || statusParam !== "all" || !!fromWarehouseParam || !!toWarehouseParam || !!fromDateParam || !!toDateParam;

  const columns = useMemo(() => buildTransferColumns(handleView), [handleView]);

  if (!canView)
    return (
      <PageWrapper
        title="Stock Transfers"
        subtitle="Move stock between warehouse locations"
      >
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Stock Transfers"
      subtitle="Move stock between warehouse locations"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={statusParam} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px] text-xs")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TRANSFER_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-[160px]">
            <Combobox
              options={warehouseOptions}
              value={fromWarehouseParam}
              onChange={handleFromWarehouseChange}
              placeholder="From warehouse"
              searchPlaceholder="Search warehouses…"
              emptyText="No warehouses found"
              className="text-xs"
            />
          </div>
          <div className="w-[160px]">
            <Combobox
              options={warehouseOptions}
              value={toWarehouseParam}
              onChange={handleToWarehouseChange}
              placeholder="To warehouse"
              searchPlaceholder="Search warehouses…"
              emptyText="No warehouses found"
              className="text-xs"
            />
          </div>
          <DateRangePicker
            from={fromDateParam || undefined}
            to={toDateParam || undefined}
            onChange={handleDateRangeChange}
            placeholder="Date range"
            className="w-[180px]"
          />
          {hasActiveFilters && (
            <AnimatedIconButton icon={XIcon} iconSize={14} iconClassName="mr-0.5" variant="ghost" size="sm" className="text-xs gap-1" onClick={handleClearFilters}>
              Clear filters
            </AnimatedIconButton>
          )}
        </div>
      }
      actions={
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" className="text-xs" onClick={handleOpenSheet}>
          New Transfer
        </AnimatedIconButton>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {isError ? (
        <ErrorState
          title="Failed to load transfers"
          description="An error occurred while fetching transfer records."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : transfers.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          <InventoryEmptyState
            illustration={hasActiveFilters ? <EmptySearchIllustration /> : <EmptyTransferIllustration />}
            title={hasActiveFilters ? "No matching transfers" : "No transfers yet"}
            description={
              hasActiveFilters
                ? "No transfers match your current filters. Try adjusting your search or filter criteria."
                : "Create a transfer to move stock between locations."
            }
            action={
              hasActiveFilters
                ? { label: "Clear Filters", onClick: handleClearFilters }
                : { label: "New Transfer", onClick: handleOpenSheet }
            }
            className="flex-1"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
            <DataTable
              className="flex-1 min-h-0"
              data={transfers}
              columns={columns}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              minWidth="700px"
              pagination={{
                mode: "server",
                page,
                pageSize: LIMIT,
                total,
                onPageChange: setPage,
              }}
              search={{
                value: searchQ,
                onChange: handleSearchChange,
                placeholder: "Search by ref, warehouse, product, SKU, notes…",
              }}
            />
          </motion.div>
        </motion.div>
      )}
      </div>
      <NewTransferSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
