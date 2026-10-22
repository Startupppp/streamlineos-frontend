"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useLocations } from "@/hooks/api/inventory/warehouses";
import { LOCATION_TYPE_LABELS } from "@/features/inventory/components/warehouse/location-type-constants";
import type { SlottingRecommendation } from "@/hooks/api/inventory/slotting-labor";
import { locationsUnder } from "./location-tree";

interface ReslotApproveControlProps {
  recommendation: SlottingRecommendation;
  canReadLocations: boolean;
  isPending: boolean;
  onApprove: (recommendation: SlottingRecommendation, toLocationId: number) => void;
}

export function ReslotApproveControl({
  recommendation,
  canReadLocations,
  isPending,
  onApprove,
}: ReslotApproveControlProps) {
  const [destination, setDestination] = useState("");
  const locationsQuery = useLocations(canReadLocations ? recommendation.warehouseId : 0);

  const options = useMemo(
    () =>
      locationsUnder(locationsQuery.data ?? [], recommendation.toZoneLocationId)
        .filter((location) => location.isActive)
        .map((location) => ({
          value: String(location.id),
          label: `${location.name} · ${location.code}`,
          sublabel: LOCATION_TYPE_LABELS[location.locationType],
        })),
    [locationsQuery.data, recommendation.toZoneLocationId],
  );

  const handleApprove = useCallback(() => {
    const toLocationId = Number(destination);
    if (!Number.isInteger(toLocationId) || toLocationId <= 0) return;
    onApprove(recommendation, toLocationId);
  }, [destination, onApprove, recommendation]);

  if (!canReadLocations)
    return (
      <span className="text-dense italic text-muted-foreground">
        Naming a bin needs warehouse access
      </span>
    );

  return (
    <div className="flex items-center gap-2">
      <Combobox
        options={options}
        value={destination}
        onChange={setDestination}
        ariaLabel={`Destination under the target zone for recommendation ${recommendation.id}`}
        placeholder={locationsQuery.isLoading ? "Loading locations…" : "Choose a bin"}
        searchPlaceholder="Search by name or code…"
        emptyText={
          locationsQuery.isLoading
            ? "Loading locations…"
            : "No active locations under this zone were returned. The warehouse list is capped at 100 rows, so a large building may not have reached this zone."
        }
        disabled={locationsQuery.isLoading || options.length === 0}
        className="h-8 w-56"
      />
      <Button
        size="sm"
        variant="outline"
        className="text-dense"
        disabled={!destination || isPending}
        onClick={handleApprove}
      >
        Approve
      </Button>
    </div>
  );
}
