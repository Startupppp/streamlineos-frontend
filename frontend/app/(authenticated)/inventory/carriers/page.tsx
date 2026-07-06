"use client";

import { Suspense, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { CarrierSheet } from "@/features/inventory/components/shipping/carrier-sheet";
import { useCarriers, type Carrier } from "@/hooks/api/inventory/shipping";

function CarriersPageInner() {
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | undefined>(undefined);

  function handleRowClick(carrier: Carrier): void {
    setSelectedCarrier(carrier);
    setSheetOpen(true);
  }

  function handleAddCarrier(): void {
    setSelectedCarrier(undefined);
    setSheetOpen(true);
  }

  function handleSheetChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setSelectedCarrier(undefined);
  }

  const carriersQuery = useCarriers();
  const items = carriersQuery.data ?? [];

  function handleRetry(): void {
    void carriersQuery.refetch();
  }

  const columns: DataTableColumn<Carrier>[] = [
    {
      key: "name",
      header: "Name",
      cell: (c) => <span className="font-medium">{c.name}</span>,
      sortable: true,
      sortValue: (c) => c.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (c) => <span className="font-mono text-sm">{c.code}</span>,
    },
    {
      key: "trackingUrlTemplate",
      header: "Tracking URL",
      cell: (c) =>
        c.trackingUrlTemplate ? (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
            {c.trackingUrlTemplate}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "isActive",
      header: "Active",
      cell: (c) => (
        <Badge
          variant="outline"
          className={cn(
            "h-4 text-[9px] px-1.5 py-0 border",
            c.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-700 border-slate-200",
          )}
        >
          {c.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageWrapper
        eyebrow="Inventory · Shipping"
        title="Carriers"
        subtitle={
          items.length > 0
            ? `${items.length} ${items.length === 1 ? "carrier" : "carriers"}`
            : "Manage shipping carriers and tracking"
        }
        actions={
          <Button size="sm" onClick={handleAddCarrier}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Carrier
          </Button>
        }
      >
        {carriersQuery.error ? (
          <ErrorState
            title="Failed to load carriers"
            description={carriersQuery.error.message}
            onRetry={handleRetry}
            className="min-h-[40vh]"
          />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(c) => c.id}
            isLoading={carriersQuery.isLoading}
            onRowClick={handleRowClick}
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyProductsIllustration />}
                title="No carriers yet"
                description="Add a carrier to assign tracking numbers to shipments."
                action={{ label: "Add Carrier", onClick: handleAddCarrier }}
                className="border-0 bg-transparent min-h-[40vh]"
              />
            }
            minWidth="480px"
          />
        )}
      </PageWrapper>

      <CarrierSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        carrier={selectedCarrier}
      />
    </>
  );
}

export default function CarriersPage() {
  return (
    <Suspense>
      <CarriersPageInner />
    </Suspense>
  );
}
