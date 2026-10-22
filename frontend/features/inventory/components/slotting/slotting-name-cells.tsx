"use client";

import { useLocations } from "@/hooks/api/inventory/warehouses";
import { cn } from "@/lib/utils";

interface ResolvedNameProps {
  name: string | undefined;
  isLoading: boolean;
  missing: string;
  className?: string;
}

export function ResolvedName({ name, isLoading, missing, className }: ResolvedNameProps) {
  if (name) return <span className={className}>{name}</span>;
  return (
    <span className={cn("italic text-muted-foreground", className)}>
      {isLoading ? "Loading…" : missing}
    </span>
  );
}

interface LocationNameCellProps {
  warehouseId: number;
  locationId: number;
  canRead: boolean;
  className?: string;
}

export function LocationNameCell({
  warehouseId,
  locationId,
  canRead,
  className,
}: LocationNameCellProps) {
  const locationsQuery = useLocations(canRead ? warehouseId : 0);
  const location = (locationsQuery.data ?? []).find((row) => row.id === locationId);

  if (!canRead)
    return (
      <span className={cn("italic text-muted-foreground", className)}>
        Needs warehouse access
      </span>
    );

  return (
    <ResolvedName
      name={location ? `${location.name} · ${location.code}` : undefined}
      isLoading={locationsQuery.isLoading}
      missing="No longer in this warehouse"
      className={className}
    />
  );
}
