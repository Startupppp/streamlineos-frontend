"use client";

import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { Download } from "lucide-react";
import { useMovementsReport, type MovementType } from "@/hooks/api/inventory/reports";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";

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
  PURCHASE: "bg-green-100 text-green-800 border-green-200",
  SALE: "bg-blue-100 text-blue-800 border-blue-200",
  GRN: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ADJUSTMENT_IN: "bg-green-100 text-green-800 border-green-200",
  ADJUSTMENT_OUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  TRANSFER_IN: "bg-cyan-100 text-cyan-800 border-cyan-200",
  TRANSFER_OUT: "bg-orange-100 text-orange-800 border-orange-200",
  RETURN_IN: "bg-purple-100 text-purple-800 border-purple-200",
  RETURN_OUT: "bg-purple-100 text-purple-800 border-purple-200",
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
        <span className="text-[11px] whitespace-nowrap text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 py-0 ${TYPE_CLASS[row.type]}`}>
          {row.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span className="text-[11px] font-medium">{row.productName}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      cell: (row) => <span className="text-[11px] font-mono">{row.sku}</span>,
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row) => <span className="text-[11px]">{row.warehouseName ?? "—"}</span>,
    },
    {
      key: "locationName",
      header: "Location",
      cell: (row) => <span className="text-[11px]">{row.locationName ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <span
          className={`text-[11px] font-mono tabular-nums font-semibold ${row.quantity >= 0 ? "text-green-700" : "text-red-700"}`}
        >
          {row.quantity >= 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Balance After",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums text-[11px]",
      cell: (row) => row.balanceAfter !== null ? row.balanceAfter : "—",
    },
    {
      key: "referenceType",
      header: "Reference",
      cell: (row) => (
        <span className="text-[11px]">
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
        <span className="text-[11px] text-muted-foreground">{row.performedBy ?? "—"}</span>
      ),
    },
  ];
}

const MOVEMENTS_COLUMNS = buildMovementsColumns();

function exportToCsv(rows: MovementRow[]): void {
  const headers = ["Date", "Type", "Product", "SKU", "Warehouse", "Location", "Qty", "Balance After", "Reference", "Performed By"];
  const csvRows = rows.map((r) => [
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
  ]);
  const content = [headers, ...csvRows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MovementsReportPage() {
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
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <Select value={warehouseId || "ALL"} onValueChange={handleWarehouseChange}>
        <SelectTrigger className="h-8 w-full sm:max-w-[180px] text-xs">
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
        <SelectTrigger className="h-8 w-full sm:max-w-[160px] text-xs">
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
      <DatePicker value={dateFrom} onChange={handleDateFromChange} placeholder="From" className="w-full sm:max-w-[160px] h-8 text-xs" />
      <DatePicker value={dateTo} onChange={handleDateToChange} placeholder="To" className="w-full sm:max-w-[160px] h-8 text-xs" />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs ml-auto shrink-0"
        onClick={handleExportClick}
        disabled={rows.length === 0}
        aria-label="Export movements as CSV"
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export CSV
      </Button>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Movements"
      subtitle="Full audit trail of all inventory movements — receipts, shipments, adjustments, and transfers."
      filters={filterBar}
    >
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} />
      )}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No movements found"
          description="No stock movements match the selected filters."
        />
      )}

      {!query.error && (query.isLoading || rows.length > 0) && (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={rows}
              columns={MOVEMENTS_COLUMNS}
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
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
