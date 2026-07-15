"use client";

import { useState, useCallback, useMemo, use } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, MapPin } from "lucide-react";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWarehouse, useLocations } from "@/hooks/api/inventory/warehouses";
import type { LocationType, WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import { cn } from "@/lib/utils";
import {
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_COLORS,
  SPECIAL_LOCATION_TYPES,
} from "@/features/inventory/components/warehouse/location-type-constants";
import { AddLocationSheet } from "@/features/inventory/components/warehouse/add-location-sheet";
import { WarehouseStockTab } from "@/features/inventory/components/warehouse/warehouse-stock-tab";

function groupByType(locations: WarehouseLocation[]): Map<LocationType, WarehouseLocation[]> {
  const map = new Map<LocationType, WarehouseLocation[]>();
  for (const lt of LOCATION_TYPE_ORDER) {
    map.set(lt, []);
  }
  for (const loc of locations) {
    const arr = map.get(loc.locationType);
    if (arr) arr.push(loc);
  }
  return map;
}

function LocationRow({ location }: { location: WarehouseLocation }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0 h-4 shrink-0",
            LOCATION_TYPE_COLORS[location.locationType],
          )}
        >
          {LOCATION_TYPE_LABELS[location.locationType]}
        </Badge>
        <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
        <span className="text-[11px] text-muted-foreground font-mono shrink-0">
          {location.code}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {SPECIAL_LOCATION_TYPES.includes(location.locationType) && (
          <Badge
            variant="outline"
            className="h-4 text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0"
          >
            Special
          </Badge>
        )}
        {!location.isActive && (
          <Badge
            variant="outline"
            className="h-4 text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0"
          >
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId: warehouseIdStr } = use(params);
  const warehouseId = Number(warehouseIdStr);
  const shouldReduceMotion = useReducedMotion();

  const {
    data: warehouseData,
    isLoading: whLoading,
    isError: whError,
    refetch: refetchWarehouse,
  } = useWarehouse(warehouseId);
  const {
    data: locationsData,
    isLoading: locLoading,
    isError: locError,
    refetch: refetchLocations,
  } = useLocations(warehouseId);

  const [sheetOpen, setSheetOpen] = useState(false);

  const warehouse = warehouseData;
  const locations = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData],
  );
  const grouped = useMemo(() => groupByType(locations), [locations]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  function handleRetry() {
    void refetchWarehouse();
    void refetchLocations();
  }

  const isLoading = whLoading || locLoading;
  const isError = whError || locError;

  if (isLoading) {
    return (
      <InventoryDetailPageLoading
        title="Warehouse"
        subtitle="Loading..."
        backHref="/inventory/warehouses"
        actions={null}
      />
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Warehouse"
        backHref="/inventory/warehouses"
      >
        <ErrorState
          title="Failed to load warehouse"
          description="An error occurred while fetching warehouse data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!warehouse) {
    return (
      <PageWrapper
        title="Warehouse not found"
        backHref="/inventory/warehouses"
      >
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="Warehouse not found"
          description="This warehouse does not exist or you do not have access."
          action={{ label: "Back to Warehouses", href: "/inventory/warehouses" }}
        />
      </PageWrapper>
    );
  }

  const cityLine = [warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(", ");

  return (
    <PageWrapper
      title={warehouse.name}
      backHref="/inventory/warehouses"
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {warehouse.code}
          </span>
          {cityLine && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {cityLine}
            </span>
          )}
          {warehouse.isDefault && (
            <Badge
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 bg-primary/10 text-foreground border-primary/20"
            >
              Default
            </Badge>
          )}
          {!warehouse.isActive && (
            <Badge
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border"
            >
              Inactive
            </Badge>
          )}
        </span>
      }
      badge={`${locations.length} location${locations.length !== 1 ? "s" : ""}`}
      actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Location
        </Button>
      }
    >
      <Tabs defaultValue="locations">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          {locations.length === 0 ? (
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title="No locations yet"
              description="Add zones, aisles, racks, and bins to organize stock within this warehouse."
              action={{ label: "Add Location", onClick: handleOpenSheet }}
            />
          ) : (
            <motion.div
              className="space-y-4"
              variants={shouldReduceMotion ? undefined : staggerContainer}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
            >
              {LOCATION_TYPE_ORDER.map((lt) => {
                const items = grouped.get(lt) ?? [];
                if (items.length === 0) return null;
                return (
                  <motion.div key={lt} variants={shouldReduceMotion ? undefined : fadeUp}>
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] h-4 px-1.5 py-0", LOCATION_TYPE_COLORS[lt])}
                          >
                            {LOCATION_TYPE_LABELS[lt]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {items.length} {items.length === 1 ? "location" : "locations"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="divide-y divide-border/60">
                          {items.map((loc) => (
                            <LocationRow key={loc.id} location={loc} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="stock">
          <WarehouseStockTab warehouseId={warehouseId} />
        </TabsContent>
      </Tabs>

      <AddLocationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        warehouseId={warehouseId}
        warehouseName={warehouse.name}
        locations={locations}
      />
    </PageWrapper>
  );
}
