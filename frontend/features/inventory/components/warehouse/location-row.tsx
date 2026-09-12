"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import {
  LOCATION_TYPE_COLORS,
  LOCATION_TYPE_LABELS,
  SPECIAL_LOCATION_TYPES,
} from "@/features/inventory/components/warehouse/location-type-constants";
import { EditLocationAction } from "./edit-location-sheet";

interface LocationRowProps {
  location: WarehouseLocation;
  warehouseId: number;
  /** Every location in the warehouse, for the parent selector inside the edit sheet. */
  locations: WarehouseLocation[];
}

export function LocationRow({ location, warehouseId, locations }: LocationRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className={cn(
            "text-micro px-1.5 py-0 h-4 shrink-0",
            LOCATION_TYPE_COLORS[location.locationType],
          )}
        >
          {LOCATION_TYPE_LABELS[location.locationType]}
        </Badge>
        <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
        <span className="text-dense text-muted-foreground font-mono shrink-0">
          {location.code}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {SPECIAL_LOCATION_TYPES.includes(location.locationType) && (
          <Badge
            variant="outline"
            className="h-4 text-micro px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0"
          >
            Special
          </Badge>
        )}
        {!location.isActive && (
          <Badge
            variant="outline"
            className="h-4 text-micro px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0"
          >
            Inactive
          </Badge>
        )}
        <EditLocationAction location={location} warehouseId={warehouseId} locations={locations} />
      </div>
    </div>
  );
}
