"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useLocations, type LocationType } from "@/hooks/api/inventory/warehouses";

interface LocationSelectProps {
  warehouseId: number | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeOnly?: boolean;
  /**
   * Narrow the list to one kind of bin — a write-off's scrap location is the
   * first caller. Extending this select rather than writing a second one, so a
   * later change to how a location is labelled reaches every picker.
   */
  locationTypes?: readonly LocationType[];
}

export function LocationSelect({
  warehouseId,
  value,
  onChange,
  placeholder = "Select location…",
  disabled,
  className,
  activeOnly = false,
  locationTypes,
}: LocationSelectProps) {
  const resolvedWarehouseId = warehouseId ?? 0;
  const { data: locations = [], isLoading } = useLocations(resolvedWarehouseId);

  const options = useMemo(() => {
    let source = activeOnly ? locations.filter((loc) => loc.isActive) : locations;
    if (locationTypes) source = source.filter((loc) => locationTypes.includes(loc.locationType));
    return source.map((loc) => ({
      value: String(loc.id),
      label: loc.name,
      sublabel: `Code: ${loc.code}`,
    }));
  }, [locations, activeOnly, locationTypes]);

  const noWarehouse = resolvedWarehouseId === 0;

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={noWarehouse ? "Select warehouse first" : placeholder}
      searchPlaceholder="Search location…"
      emptyText={
        noWarehouse
          ? "Select a warehouse first"
          : isLoading
            ? "Loading locations…"
            : "No locations found."
      }
      disabled={disabled || isLoading || noWarehouse}
      className={className}
    />
  );
}
