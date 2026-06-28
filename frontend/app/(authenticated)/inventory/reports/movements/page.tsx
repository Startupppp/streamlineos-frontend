"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { useMovementsReport, type MovementType } from "@/lib/api/hooks/inventory/reports";
import { useWarehouses } from "@/lib/api/hooks/inventory/warehouses";

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

const TYPE_VARIANT: Record<MovementType, "default" | "secondary" | "destructive" | "outline"> = {
  PURCHASE: "default",
  SALE: "outline",
  GRN: "default",
  ADJUSTMENT_IN: "secondary",
  ADJUSTMENT_OUT: "secondary",
  TRANSFER_IN: "default",
  TRANSFER_OUT: "outline",
  RETURN_IN: "secondary",
  RETURN_OUT: "secondary",
};

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

export default function MovementsReportPage() {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [movementType, setMovementType] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  const query = useMovementsReport({
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
    type: movementType === "ALL" ? undefined : movementType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 200,
  });

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value === "ALL" ? "" : value);
  }

  function handleTypeChange(value: string): void {
    setMovementType(value);
  }

  function handleDateFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateFrom(event.target.value);
  }

  function handleDateToChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateTo(event.target.value);
  }

  const rows = query.data ?? [];

  function handleRetry() { void query.refetch(); }

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Movements"
      subtitle="Full audit trail of all inventory movements — receipts, shipments, adjustments, and transfers."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4 flex-wrap">
        <Select value={warehouseId || "ALL"} onValueChange={handleWarehouseChange}>
          <SelectTrigger className="w-full sm:max-w-[180px]">
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
          <SelectTrigger className="w-full sm:max-w-[160px]">
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
        <Input
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className="w-full sm:max-w-[160px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className="w-full sm:max-w-[160px]"
        />
      </div>

      {query.isLoading && <LoadingState variant="table" rows={10} />}
      {query.error && <ErrorState description={query.error.message} onRetry={handleRetry} />}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No movements found"
          description="No stock movements match the selected filters."
        />
      )}

      {rows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={TYPE_VARIANT[row.type]}
                      className={TYPE_CLASS[row.type]}
                    >
                      {row.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell>{row.warehouseName ?? "—"}</TableCell>
                  <TableCell>{row.locationName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    <span className={row.quantity >= 0 ? "text-green-700" : "text-red-700"}>
                      {row.quantity >= 0 ? "+" : ""}{row.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.balanceAfter !== null ? row.balanceAfter : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.referenceType && row.referenceNumber
                      ? `${row.referenceType} ${row.referenceNumber}`
                      : row.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{row.performedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
