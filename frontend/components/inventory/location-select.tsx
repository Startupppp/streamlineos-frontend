"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useLocations } from "@/hooks/api/inventory/warehouses";

interface LocationSelectProps {
  warehouseId: number | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeOnly?: boolean;
}

export function LocationSelect({
  warehouseId,
  value,
  onChange,
  placeholder = "Select location…",
  disabled,
  className,
  activeOnly = false,
}: LocationSelectProps) {
  const resolvedWarehouseId = warehouseId ?? 0;
  const { data: locations = [], isLoading } = useLocations(resolvedWarehouseId);

  const options = useMemo(() => {
    const source = activeOnly ? locations.filter((loc) => loc.isActive) : locations;
    return source.map((loc) => ({
      value: String(loc.id),
      label: loc.name,
      sublabel: `Code: ${loc.code}`,
    }));
  }, [locations, activeOnly]);

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
