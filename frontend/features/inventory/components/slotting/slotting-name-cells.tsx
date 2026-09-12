"use client";

import { useLocations } from "@/hooks/api/inventory/warehouses";
import { cn } from "@/lib/utils";

interface ResolvedNameProps {
  name: string | undefined;
  isLoading: boolean;
  /** What to say when the list has arrived and the row is not in it. */
  missing: string;
  className?: string;
}

/**
 * A name, or an honest account of why there isn't one.
 *
 * Frontend §5 forbids rendering the id, and the two failure modes need different
 * words: a list still in flight is not the same fact as a referenced row that is
 * gone. A blank would read as "no category", which is a third claim and the only
 * one that is never true here.
 */
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

/**
 * A location's name and code, resolved from its warehouse's already-cached list.
 *
 * It is a component rather than a lookup passed down because a rule or a
 * recommendation names a location in *its own* warehouse, and locations are
 * fetched per warehouse. React Query dedupes by key, so a table of 25 rows in
 * one building makes one request, not 25.
 *
 * `canRead` is threaded from the page rather than read here: a disabled query
 * reports `isLoading: false`, so a refused read is indistinguishable from a
 * finished one that found nothing — which is the whole shape of the
 * denial-is-not-emptiness defect this codebase keeps rediscovering.
 */
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
