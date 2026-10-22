import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";

const MAX_DEPTH = 16;

export function locationsUnder(
  locations: readonly WarehouseLocation[],
  rootId: number,
): WarehouseLocation[] {
  const byParent = new Map<number, WarehouseLocation[]>();
  for (const location of locations) {
    if (location.parentLocationId === null) continue;
    const siblings = byParent.get(location.parentLocationId);
    if (siblings) siblings.push(location);
    else byParent.set(location.parentLocationId, [location]);
  }

  const root = locations.find((location) => location.id === rootId);
  if (!root) return [];

  const collected: WarehouseLocation[] = [];
  const seen = new Set<number>();
  let frontier: WarehouseLocation[] = [root];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth += 1) {
    const next: WarehouseLocation[] = [];
    for (const location of frontier) {
      if (seen.has(location.id)) continue;
      seen.add(location.id);
      collected.push(location);
      next.push(...(byParent.get(location.id) ?? []));
    }
    frontier = next;
  }
  return collected;
}
