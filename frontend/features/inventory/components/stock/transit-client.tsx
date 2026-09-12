"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, PackageX, Truck } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  useStrandedTransit,
  type StrandedTransitRow,
  type StrandedTransitView,
} from "@/hooks/api/inventory/transit";
import { TransitExitSheet } from "./transit-exit-sheet";

const ALL_WAREHOUSES = "__all__";

const VIEW_LABEL: Record<StrandedTransitView, string> = {
  ANY: "Everything in transit",
  STRANDED: "Needs a decision",
};

function isTransitView(value: string): value is StrandedTransitView {
  return value === "ANY" || value === "STRANDED";
}

/**
 * Goods on a van, and goods a short receipt left behind.
 *
 * `dispatchTransfer` parks stock at the source warehouse's transit bin and
 * `completeTransfer` takes off it only what was actually received. The
 * difference stays there — on hand, unsellable, counted against the source
 * warehouse — and `cancelTransfer` refuses anything past RESERVED, so until the
 * exit command existed there was no route out of the waypoint at all. This is
 * the queue that command acts on: one row per transfer line that dispatched
 * more than it received.
 */
export function TransitClient() {
  const canView = useCan("inventory:stock:read");
  const canExit = useCan("inventory:transit:abandon");

  const [view, setView] = useState<StrandedTransitView>("STRANDED");
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<StrandedTransitRow | null>(null);

  const { data: warehousesResponse } = useWarehouses();
  const warehouses = warehousesResponse?.items ?? [];
  const { data, isLoading, isError, error, refetch } = useStrandedTransit({
    view,
    warehouseId,
    page,
    limit: pageSize,
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const warehouseName = useMemo(() => {
    const byId = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
    return (id: number) => byId.get(id) ?? "Transit";
  }, [warehouses]);

  const strandedUnits = useMemo(
    () => rows.reduce((total, row) => total + Number(row.quantityStranded), 0),
    [rows],
  );
  const affectedTransfers = useMemo(
    () => new Set(rows.map((row) => row.transferId)).size,
    [rows],
  );

  function handleViewChange(next: string): void {
    if (!isTransitView(next)) return;
    setView(next);
    setPage(1);
  }

  function handleWarehouseChange(next: string): void {
    setWarehouseId(next === ALL_WAREHOUSES ? undefined : Number(next));
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setSelected(null);
  }

  const columns: DataTableColumn<StrandedTransitRow>[] = useMemo(
    () => [
      {
        key: "document",
        header: "Transfer",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.referenceNumber ?? "Unreferenced"}</p>
            <p className="text-dense text-muted-foreground">
              {row.dispatchedAt ? `Dispatched ${formatDateTime(row.dispatchedAt)}` : "Not dispatched"}
            </p>
          </div>
        ),
      },
      {
        key: "product",
        header: "Product",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.variantName ?? row.sku ?? "Unnamed product"}</p>
            {row.sku ? <p className="text-dense text-muted-foreground">{row.sku}</p> : null}
          </div>
        ),
      },
      {
        key: "grain",
        header: "Lot / serial",
        cell: (row) => (
          <span className="text-dense text-muted-foreground">
            {row.lotNumber ?? (row.serialId === null ? "—" : "Serialised")}
          </span>
        ),
      },
      {
        key: "standingOn",
        header: "Standing on",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{warehouseName(row.transitWarehouseId)}</p>
            <p className="text-dense text-muted-foreground">
              {row.transitLocationCode ?? "Transit bin"}
            </p>
          </div>
        ),
      },
      {
        key: "dispatched",
        header: "Dispatched",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => row.quantityDispatched,
      },
      {
        key: "received",
        header: "Received",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => row.quantityReceived,
      },
      {
        key: "stranded",
        header: "Stranded",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums font-semibold",
        cell: (row) => row.quantityStranded,
      },
      {
        key: "status",
        header: "Transfer status",
        cell: (row) => (
          <Badge variant="outline" className="h-5 px-2 py-0.5 text-dense">
            {row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-28",
        className: "w-28",
        cell: (row) =>
          canExit ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setSelected(row)}
            >
              Resolve
            </Button>
          ) : null,
      },
    ],
    [canExit, warehouseName],
  );

  if (!canView) {
    return (
      <PageWrapper title="In transit">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="In transit"
        subtitle="Goods a dispatch put on the road, and what a short receipt left behind."
        noInternalScroll
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={view} onValueChange={handleViewChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-52")} aria-label="Which lines to show">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STRANDED">{VIEW_LABEL.STRANDED}</SelectItem>
                <SelectItem value="ANY">{VIEW_LABEL.ANY}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={warehouseId === undefined ? ALL_WAREHOUSES : String(warehouseId)}
              onValueChange={handleWarehouseChange}
            >
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-48")} aria-label="Filter by warehouse">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WAREHOUSES}>All warehouses</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <StatCardGrid cols={3}>
            <StatCard
              label="Lines on this page"
              value={isLoading ? "—" : String(rows.length)}
              icon={Truck}
              tone="blue"
              isLoading={isLoading}
            />
            <StatCard
              label="Transfers affected"
              value={isLoading ? "—" : String(affectedTransfers)}
              icon={AlertTriangle}
              tone={affectedTransfers > 0 ? "amber" : "default"}
              isLoading={isLoading}
            />
            <StatCard
              label="Units awaiting a decision"
              value={isLoading ? "—" : strandedUnits.toFixed(2)}
              icon={PackageX}
              tone={strandedUnits > 0 ? "red" : "emerald"}
              isLoading={isLoading}
              hint="Counted across the rows shown"
            />
          </StatCardGrid>

          {isError ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load what is in transit"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              getRowKey={(row) => row.transferLineId}
              isLoading={isLoading}
              className="flex-1 min-h-0"
              minWidth="1080px"
              emptyState={
                view === "STRANDED" ? (
                  <InventoryEmptyState
                    illustrationPreset="inventory"
                    title="Nothing is stranded"
                    description="Every dispatched line has been received in full, so no units are sitting on a transit bin waiting for somebody to decide."
                    compact
                  />
                ) : (
                  <InventoryEmptyState
                    illustrationPreset="inventory"
                    title="Nothing is on the road"
                    description="No transfer has been dispatched and left open. Dispatch one from Transfers and it will appear here until it is received."
                    compact
                  />
                )
              }
              pagination={{
                mode: "server",
                page,
                pageSize,
                total: data?.total ?? 0,
                onPageChange: setPage,
                onPageSizeChange: setPageSize,
                pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
              }}
            />
          )}
        </div>
      </PageWrapper>

      <TransitExitSheet row={selected} onOpenChange={handleSheetOpenChange} />
    </>
  );
}
