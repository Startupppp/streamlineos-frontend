"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import {
  useWarehouseAssignees,
  WAREHOUSE_ASSIGNMENT_PERMISSION,
} from "@/hooks/api/inventory/warehouses";

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
  canRead: boolean;
  members: WarehouseRosterMember[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

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
