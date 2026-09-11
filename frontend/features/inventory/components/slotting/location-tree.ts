import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";

/**
 * The same depth cap `SlottingService.slotFor`'s recursive CTE uses. A cycle in
 * `parent_location_id` is not supposed to exist, and a walk that trusts it not
 * to is a hang.
 */
const MAX_DEPTH = 16;

/**
 * Every location at or below `rootId`, mirroring the backend's zone expansion.
 *
 * `slotFor` walks `inv_locations` recursively from the rule's target and treats
 * the whole subtree — the root row included — as the places the rule points at.
 * The bin picker on a re-slot recommendation offers exactly that set, so the
 * operator cannot name a destination outside the zone the recommendation is
 * about.
 *
 * ⚠️ It can only walk what was loaded. `GET /inventory/warehouses/:id/locations`
 * is capped at 100 rows ordered by `code` and its controller accepts no page
 * parameter, so in a warehouse with more than 100 locations this set is a
 * prefix of the truth rather than the truth. The callers say so on screen
 * instead of pretending a short list is a complete one.
 */
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
