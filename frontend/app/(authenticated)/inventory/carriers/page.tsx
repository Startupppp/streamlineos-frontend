"use client";

import { Suspense, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
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
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";

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

  const { iconRef, hoverHandlers } = useAnimatedIcon();
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
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
              : "bg-muted text-muted-foreground border-border",
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
        title="Carriers"
        subtitle={
          items.length > 0
            ? `${items.length} ${items.length === 1 ? "carrier" : "carriers"}`
            : "Manage shipping carriers and tracking"
        }
        actions={
          <Button size="sm" onClick={handleAddCarrier} {...hoverHandlers}>
            <PlusIcon ref={iconRef} size={14} className="mr-1.5" />
            Add Carrier
          </Button>
        }
      >
        {carriersQuery.error ? (
          <ErrorState
            title="Failed to load carriers"
            description={getErrorMessage(carriersQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
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
                className="border-0 bg-transparent"
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
