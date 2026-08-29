"use client";

import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useMovementsReport, type MovementType } from "@/hooks/api/inventory/reports";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { downloadCsv } from "@/features/inventory/lib";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";

const TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ALL", label: "All types" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SALE", label: "Sale" },
  { value: "GRN", label: "Goods Receipt" },
  { value: "ADJUSTMENT_IN", label: "Adjustment In" },
  { value: "ADJUSTMENT_OUT", label: "Adjustment Out" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "RETURN_IN", label: "Return In" },
  { value: "RETURN_OUT", label: "Return Out" },
];

const TYPE_CLASS: Record<MovementType, string> = {
  PURCHASE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  SALE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  GRN: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  ADJUSTMENT_IN: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  ADJUSTMENT_OUT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  TRANSFER_IN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  TRANSFER_OUT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  RETURN_IN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  RETURN_OUT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

interface MovementRow {
  id: number;
  type: MovementType;
  productName: string;
  sku: string;
  warehouseName: string | null;
  locationName: string | null;
  quantity: number;
  balanceAfter: number | null;
  referenceType: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  performedBy: string | null;
}

function buildMovementsColumns(): DataTableColumn<MovementRow>[] {
  return [
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => (
        <span className="text-dense whitespace-nowrap text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro h-4 px-1.5 py-0 ${TYPE_CLASS[row.type]}`}>
          {row.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span className="text-dense font-medium">{row.productName}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      cell: (row) => <span className="text-dense font-mono">{row.sku}</span>,
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row) => <span className="text-dense">{row.warehouseName ?? "—"}</span>,
    },
    {
      key: "locationName",
      header: "Location",
      cell: (row) => <span className="text-dense">{row.locationName ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span
          className={`text-dense font-mono tabular-nums font-semibold ${row.quantity >= 0 ? "text-status-success-ink" : "text-status-danger-ink"}`}
        >
          {row.quantity >= 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Balance After",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums text-dense",
      cell: (row) => row.balanceAfter !== null ? row.balanceAfter : "—",
    },
    {
      key: "referenceType",
      header: "Reference",
      cell: (row) => (
        <span className="text-dense">
          {row.referenceType && row.referenceNumber
            ? `${row.referenceType} ${row.referenceNumber}`
            : (row.notes ?? "—")}
        </span>
      ),
    },
    {
      key: "performedBy",
      header: "Performed By",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{row.performedBy ?? "—"}</span>
      ),
    },
  ];
}

const MOVEMENTS_COLUMNS = buildMovementsColumns();

function exportToCsv(rows: MovementRow[]): void {
  downloadCsv(
    `movements-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Date", "Type", "Product", "SKU", "Warehouse", "Location", "Qty", "Balance After", "Reference", "Performed By"],
    rows.map((r) => [
      formatDate(r.createdAt),
      r.type,
      r.productName,
      r.sku,
      r.warehouseName ?? "",
      r.locationName ?? "",
      r.quantity,
      r.balanceAfter ?? "",
      r.referenceType && r.referenceNumber ? `${r.referenceType} ${r.referenceNumber}` : (r.notes ?? ""),
      r.performedBy ?? "",
    ]),
  );
}

export default function MovementsReportPage() {
  const canView = useCan("inventory:reports:read");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [movementType, setMovementType] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  const query = useMovementsReport({
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
    type: movementType === "ALL" ? undefined : movementType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 50,
  });

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value === "ALL" ? "" : value);
    setPage(1);
  }

  function handleTypeChange(value: string): void {
    setMovementType(value);
    setPage(1);
  }

  function handleDateFromChange(value: string): void {
    setDateFrom(value);
    setPage(1);
  }

  function handleDateToChange(value: string): void {
    setDateTo(value);
    setPage(1);
  }

  function handlePageChange(nextPage: number): void {
    setPage(nextPage);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleExportClick(): void {
    exportToCsv(rows);
  }

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <Select value={warehouseId || "ALL"} onValueChange={handleWarehouseChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-full sm:max-w-44 text-xs")}>
          <SelectValue placeholder="All warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All warehouses</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={String(w.id)}>
              {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={movementType} onValueChange={handleTypeChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-full sm:max-w-40 text-xs")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePicker value={dateFrom} onChange={handleDateFromChange} placeholder="From" className="w-full sm:max-w-[160px]" />
      <DatePicker value={dateTo} onChange={handleDateToChange} placeholder="To" className="w-full sm:max-w-[160px]" />
      <AnimatedIconButton
        icon={DownloadIcon}
        iconSize={14}
        iconClassName="mr-1.5"
        variant="outline"
        size="sm"
        className="text-xs ml-auto shrink-0"
        onClick={handleExportClick}
        disabled={rows.length === 0}
        aria-label="Export movements as CSV"
      >
        Export CSV
      </AnimatedIconButton>
    </div>
  );

  if (!canView)
    return (
      <PageWrapper
        title="Stock Movements"
        subtitle="Full audit trail of all inventory movements — receipts, shipments, adjustments, and transfers."
      >
        <NoPermissionState permission="inventory:reports:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Stock Movements"
      subtitle="Full audit trail of all inventory movements — receipts, shipments, adjustments, and transfers."
      filters={filterBar}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {query.error && (
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        )}

        {!query.isLoading && !query.error && rows.length === 0 && (
          <InventoryEmptyState
            illustration={<EmptyActivityIllustration />}
            title="No movements found"
            description="No stock movements match the selected filters."
          />
        )}

        {!query.error && (query.isLoading || rows.length > 0) && (
          <DataTable
              data={rows}
              columns={MOVEMENTS_COLUMNS}
              className="flex-1 min-h-0"
              getRowKey={(row) => row.id}
              isLoading={query.isLoading}
              minWidth="900px"
              pagination={{
                mode: "server",
                page,
                pageSize: 50,
                total: query.data?.total ?? 0,
                onPageChange: handlePageChange,
              }}
            />
        )}
      </div>
    </PageWrapper>
  );
}
