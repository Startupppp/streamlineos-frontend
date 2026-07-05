"use client";

import { Suspense, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { useMovementsReport, type MovementType } from "@/hooks/api/inventory/reports";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";

const TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "all", label: "All types" },
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
  PURCHASE: "h-4 text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200",
  SALE: "h-4 text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200",
  GRN: "h-4 text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200",
  ADJUSTMENT_IN: "h-4 text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200",
  ADJUSTMENT_OUT: "h-4 text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200",
  TRANSFER_IN: "h-4 text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200",
  TRANSFER_OUT: "h-4 text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200",
  RETURN_IN: "h-4 text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200",
  RETURN_OUT: "h-4 text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200",
};

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function MovementsReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const warehouseValue = searchParams.get("warehouseId") ?? "all";
  const typeValue = searchParams.get("type") ?? "all";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const search = searchParams.get("q") ?? "";

  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  const query = useMovementsReport({
    warehouseId: warehouseValue !== "all" ? Number(warehouseValue) : undefined,
    type: typeValue !== "all" ? typeValue : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 200,
  });

  const rows = query.data ?? [];

  const filtered = search
    ? rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(search.toLowerCase()) ||
          r.sku.toLowerCase().includes(search.toLowerCase()) ||
          (r.referenceType?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.referenceNumber?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.performedBy?.toLowerCase() ?? "").includes(search.toLowerCase()),
      )
    : rows;

  function updateParam(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("q", e.target.value);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleWarehouseChange(value: string): void {
    updateParam("warehouseId", value);
  }

  function handleTypeChange(value: string): void {
    updateParam("type", value);
  }

  function handleDateFromChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("from", e.target.value);
    } else {
      params.delete("from");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleDateToChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("to", e.target.value);
    } else {
      params.delete("to");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearSearch(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleExportClick(): void {
    const headers = ["Date", "Type", "Product", "SKU", "Warehouse", "Location", "Qty", "Balance After", "Reference", "Performed By"];
    const csvRows = filtered.map((r) => [
      r.createdAt, r.type, r.productName, r.sku, r.warehouseName ?? "", r.locationName ?? "",
      r.quantity, r.balanceAfter ?? "",
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

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Movements"
      subtitle={
        query.data !== undefined
          ? `${filtered.length} movement${filtered.length !== 1 ? "s" : ""}`
          : "Full audit trail of inventory movements"
      }
      filtersCollapseBreakpoint="md"
      filters={
        <>
          <div className="relative min-w-0 flex-1 max-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search…"
              className="h-8 w-full min-w-0 pl-8 text-xs"
            />
          </div>
          <Select value={warehouseValue} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="w-[150px] h-8 text-xs shrink-0">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeValue} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
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
            className="w-[130px] h-8 text-xs shrink-0"
            aria-label="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="w-[130px] h-8 text-xs shrink-0"
            aria-label="To date"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={handleExportClick}
            disabled={filtered.length === 0}
            aria-label="Export movements as CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </>
      }
    >
      {query.isLoading && <SkeletonTable rows={8} columns={10} />}
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} className="flex-1" />
      )}

      {!query.isLoading && !query.error && filtered.length === 0 && (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No movements found"
          description={
            search || warehouseValue !== "all" || typeValue !== "all" || dateFrom || dateTo
              ? "No stock movements match the selected filters."
              : "No stock movements have been recorded yet."
          }
          action={
            search
              ? { label: "Clear search", onClick: handleClearSearch }
              : undefined
          }
          className="min-h-[40vh]"
        />
      )}

      {!query.isLoading && !query.error && filtered.length > 0 && (
        <div className="rounded-md border border-border bg-card overflow-x-auto">
          <Table className="min-w-[940px] text-[11px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="border-b-2 border-border">
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Date</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Product</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">SKU</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Warehouse</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Location</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Qty</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Balance After</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Reference</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="h-8 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-2 py-1 whitespace-nowrap font-mono tabular-nums">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge variant="outline" className={TYPE_CLASS[row.type]}>
                      {row.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1 font-medium">{row.productName}</TableCell>
                  <TableCell className="px-2 py-1 font-mono tabular-nums">{row.sku}</TableCell>
                  <TableCell className="px-2 py-1">{row.warehouseName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1">{row.locationName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums font-medium">
                    <span className={row.quantity >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {row.quantity >= 0 ? "+" : ""}
                      {row.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums">
                    {row.balanceAfter !== null ? row.balanceAfter : "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {row.referenceType && row.referenceNumber
                      ? `${row.referenceType} ${row.referenceNumber}`
                      : (row.notes ?? "—")}
                  </TableCell>
                  <TableCell className="px-2 py-1">{row.performedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}

export default function MovementsReportPage() {
  return (
    <Suspense>
      <MovementsReportContent />
    </Suspense>
  );
}
