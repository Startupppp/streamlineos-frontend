"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ErrorState, AppDialog } from "@/components/shared";
import { ShipmentDetailSheet } from "@/features/inventory/components/shipping/shipment-detail-sheet";
import {
  SHIPMENT_STATUS_BADGE,
  SHIPMENT_STATUS_LABEL,
  type ShipmentStatus,
} from "@/features/inventory/lib";
import { useShipments, useCreateShipment, type Shipment } from "@/hooks/api/inventory/shipping";
import { toast } from "sonner";

const PAGE_LIMIT = 20;

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function ShipmentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [newSoId, setNewSoId] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");

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
    setNewSoId("");
    setNewNotes("");
    setCreateOpen(true);
  }

  function handleCreateClose(): void {
    setCreateOpen(false);
    setNewSoId("");
    setNewNotes("");
  }

  function handleSoIdChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNewSoId(e.target.value);
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setNewNotes(e.target.value);
  }

  const createMutation = useCreateShipment();

  async function handleCreateSubmit(): Promise<void> {
    const soId = newSoId ? Number(newSoId) : undefined;
    try {
      await createMutation.mutateAsync({
        soId,
        notes: newNotes.trim() || undefined,
      });
      toast.success("Shipment created");
      handleCreateClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const statusFilter = (statusParam in SHIPMENT_STATUS_BADGE ? statusParam as ShipmentStatus : undefined);

  const shipmentsQuery = useShipments({
    status: statusFilter,
    page,
    limit: PAGE_LIMIT,
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
          className={cn("h-4 text-[9px] px-1.5 py-0 border", SHIPMENT_STATUS_BADGE[s.status])}
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
        <span className="tabular-nums text-muted-foreground">{formatDate(s.createdAt)}</span>
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

  return (
    <>
      <PageWrapper
        title="Shipments"
        subtitle={total > 0 ? `${total} ${total === 1 ? "shipment" : "shipments"}` : "Track and manage outbound shipments"}
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleNewShipment}>
            New Shipment
          </AnimatedIconButton>
        }
        filters={filtersRow}
      >
        {shipmentsQuery.error ? (
          <ErrorState
            title="Failed to load shipments"
            description={getErrorMessage(shipmentsQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={items}
            columns={columns}
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
        )}
      </PageWrapper>

      <ShipmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        shipmentId={selectedId}
      />

      <AppDialog
        open={createOpen}
        onOpenChange={handleCreateClose}
        title="New Shipment"
        description="Create a draft shipment. You can assign a carrier and packages after creation."
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleCreateClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-ship-so" className="text-xs">Sales Order ID (optional)</Label>
            <Input
              id="new-ship-so"
              type="number"
              min="1"
              placeholder="Leave blank for direct shipment"
              value={newSoId}
              onChange={handleSoIdChange}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-ship-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="new-ship-notes"
              placeholder="Any shipping instructions"
              value={newNotes}
              onChange={handleNotesChange}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>
      </AppDialog>
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
