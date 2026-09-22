"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ShipmentDetailSheet } from "@/features/inventory/components/shipping/shipment-detail-sheet";
import { ShipmentCreateDialog } from "@/features/inventory/components/shipping/shipment-create-dialog";
import {
  SHIPMENT_STATUS_BADGE,
  SHIPMENT_STATUS_LABEL,
  type ShipmentStatus,
} from "@/features/inventory/lib";
import { useShipments, type Shipment } from "@/hooks/api/inventory/shipping";


const PAGE_LIMIT = 20;

function ShipmentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const statusParam = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(shipment: Shipment): void {
    setSelectedId(shipment.id);
    setDetailOpen(true);
  }

  function handleNewShipment(): void {
    setCreateOpen(true);
  }

  const statusFilter = (statusParam in SHIPMENT_STATUS_BADGE ? statusParam as ShipmentStatus : undefined);

  const shipmentsQuery = useShipments({
    status: statusFilter,
    page,
    limit: PAGE_LIMIT,
  });

  const pageState = usePageState({
    permission: "inventory:shipments:manage",
    isLoading: shipmentsQuery.isLoading,
    isError: shipmentsQuery.isError,
    error: shipmentsQuery.error,
  });

  const items = shipmentsQuery.data?.items ?? [];
  const total = shipmentsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void shipmentsQuery.refetch();
  }

  const columns: DataTableColumn<Shipment>[] = [
    {
      key: "id",
      header: "Shipment",
      cell: (s) =>
        s.trackingNumber ?? (s.soId ? `SO-${s.soId}` : format(new Date(s.createdAt), "dd MMM yyyy")),
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0 border", SHIPMENT_STATUS_BADGE[s.status])}
        >
          {SHIPMENT_STATUS_LABEL[s.status]}
        </Badge>
      ),
    },
    {
      key: "soId",
      header: "Sales Order",
      cell: (s) =>
        s.soId ? (
          <span className="font-mono tabular-nums">SO #{s.soId}</span>
        ) : (
          <span className="text-muted-foreground text-xs">Direct</span>
        ),
    },
    {
      key: "carrier",
      header: "Carrier",
      cell: (s) =>
        s.carrierName ? (
          <span className="text-sm">{s.carrierName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "trackingNumber",
      header: "Tracking",
      cell: (s) =>
        s.trackingNumber ? (
          <span className="font-mono tabular-nums text-xs">{s.trackingNumber}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (s) => (
        <span className="tabular-nums text-muted-foreground">{formatShortDate(s.createdAt) || ""}</span>
      ),
    },
  ];

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 w-[180px] text-xs")}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="PACKED">Packed</SelectItem>
          <SelectItem value="LABEL_CREATED">Label Created</SelectItem>
          <SelectItem value="SHIPPED">Shipped</SelectItem>
          <SelectItem value="DELIVERED">Delivered</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper
        title="Shipments"
        subtitle="Track and manage outbound shipments"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <>
      <PageWrapper
        title="Shipments"
        subtitle="Track and manage outbound shipments"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleNewShipment}>
            New Shipment
          </AnimatedIconButton>
        }
        filters={filtersRow}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
            <DataTable
              data={items}
              columns={columns}
              className="flex-1 min-h-0"
              getRowKey={(s) => s.id}
              isLoading={shipmentsQuery.isLoading}
              onRowClick={handleRowClick}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptyOrdersIllustration />}
                  title="No shipments yet"
                  description="Create a shipment to track outbound deliveries."
                  action={{ label: "New Shipment", onClick: handleNewShipment }}
                  className="border-0 bg-transparent"
                />
              }
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_LIMIT,
                total,
                onPageChange: handlePageChange,
              }}
              minWidth="640px"
            />
        </div>
      </PageWrapper>

      <ShipmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        shipmentId={selectedId}
      />

      <ShipmentCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense>
      <ShipmentsPageInner />
    </Suspense>
  );
}
