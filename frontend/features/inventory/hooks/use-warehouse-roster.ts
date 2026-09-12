"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import {
  useWarehouseAssignees,
  WAREHOUSE_ASSIGNMENT_PERMISSION,
} from "@/hooks/api/inventory/warehouses";

/** `listWarehouseUsersSchema` caps `limit` at 100; asking for more is a 400. */
const ROSTER_LIMIT = 100;

export interface WarehouseRosterMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
}

export interface WarehouseRoster {
  /** Whether the viewer may read the roster at all — its own backend key. */
  canRead: boolean;
  members: WarehouseRosterMember[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Who may be handed work in a given warehouse.
 *
 * `WarehouseScopeService` denies by default, so somebody with no grant on this
 * warehouse cannot read the document, let alone act on it. Handing them a wave
 * or an exception marks it assigned and leaves the work standing still, which is
 * why every "give this to somebody" control in inventory draws its candidates
 * from here rather than from the organisation's member directory.
 *
 * It is also the only roster these operators can read. `GET
 * /organization/members` requires `settings:view`, which the `INVENTORY_MANAGER`
 * template does not carry — the people most likely to reassign inventory work
 * would otherwise be shown an empty picker and no reason why.
 *
 * `canRead` is reported separately rather than folded into an empty list on
 * purpose: "nobody has scope here" and "you may not see who has scope here" look
 * identical as an empty array and mean opposite things.
 */
export function useWarehouseRoster(
  warehouseId: number | null,
  options?: { enabled?: boolean; exclude?: string | null },
): WarehouseRoster {
  const canRead = useCan(WAREHOUSE_ASSIGNMENT_PERMISSION);
  const query = useWarehouseAssignees(
    warehouseId ?? 0,
    { page: 1, limit: ROSTER_LIMIT },
    { enabled: options?.enabled ?? true },
  );
  const exclude = options?.exclude ?? null;

  const members = useMemo(
    () =>
      (query.data?.items ?? [])
        .filter((assignee) => assignee.userId !== exclude)
        .map((assignee) => ({
          id: assignee.userId,
          name: assignee.name,
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          email: assignee.email,
          image: assignee.image,
        })),
    [query.data?.items, exclude],
  );

  return {
    canRead,
    members,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
