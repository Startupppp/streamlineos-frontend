"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAccess } from "@/hooks/api/access";
import {
  gated,
  grantsPermission,
  permissionGate,
} from "@/lib/rbac/permission-gate";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useBookingScope } from "./booking-rules";
import type {
  BookingAllocation,
  BookingAllocationResolution,
  BookingResource,
  BookingResourcePage,
  BookingResourceMaintenance,
  BookingRuleResource,
  InventoryCalendarEquipment,
  InventoryCalendarEquipmentPage,
  PendingBookingAllocationPage,
} from "./booking-resources-schema";

const resourcesContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingResourcesContract,
  ),
);
const requirementsContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingRuleResourcesContract,
  ),
);
const resourceContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingResourceContract,
  ),
);
const maintenanceContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingResourceMaintenanceContract,
  ),
);
const allocationsContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingAllocationsContract,
  ),
);
const pendingAllocationsContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.pendingBookingAllocationsContract,
  ),
);
const legacyPendingAllocationsContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.legacyPendingBookingAllocationsContract,
  ),
);
const allocationResolutionContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.bookingAllocationResolutionContract,
  ),
);
const inventoryEquipmentPageContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.inventoryCalendarEquipmentPageContract,
  ),
);
const inventoryEquipmentContract = lazyContract(() =>
  import("./booking-resources-schema").then(
    (module) => module.inventoryCalendarEquipmentContract.element,
  ),
);
const approvalPermissions = [
  "calendar:admin:manage",
  "hr:assets:manage",
  "inventory:warehouses:manage",
] as const;

function canManageResourceApprovals(
  access: ReturnType<typeof useAccess>["data"],
) {
  return approvalPermissions.some((permission) =>
    grantsPermission(access, permission),
  );
}

export interface CalendarResourceInput {
  kind: "room" | "equipment" | "resource";
  ownership: "calendar" | "source";
  sourceKey: string | null;
  sourceRecordId: string | null;
  name: string;
  location: string | null;
  capacity: number;
  divisible: boolean;
  accessibility: string[];
  requiresApproval: boolean;
}

export interface CalendarResourceUpdateInput {
  expectedVersion: number;
  name: string;
  location: string | null;
  capacity: number;
  divisible: boolean;
  accessibility: string[];
  requiresApproval: boolean;
  status: "active" | "unavailable" | "retired";
}

export function useCalendarBookingResources(cursor: string | undefined = undefined, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.resources(
      scope.orgId,
      scope.userId,
      scope.membershipId,
      scope.accessVersion,
      scope.canRead,
      cursor,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<BookingResourcePage>(
        "/calendar/resources",
        { limit: 50, ...(cursor ? { cursor } : {}) },
        signal,
        resourcesContract,
      ),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useInventoryCalendarEquipment(cursor: number | null = null, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("inventory:warehouses:read", {
    queryKey: calendarBookingQueryKeys.inventoryEquipment(
      scope.orgId,
      scope.userId,
      scope.membershipId,
      scope.accessVersion,
      cursor,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<InventoryCalendarEquipmentPage>(
        "/inventory/calendar-equipment",
        { limit: 50, ...(cursor ? { cursor } : {}) },
        signal,
        inventoryEquipmentPageContract,
      ),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export interface CreateInventoryCalendarEquipmentInput {
  warehouseId: number;
  name: string;
  location: string | null;
  capacity: number;
  productVariantId?: number | null;
}

export function useCreateInventoryCalendarEquipment() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<InventoryCalendarEquipment, Error, CreateInventoryCalendarEquipmentInput>("inventory:warehouses:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("create-inventory-equipment"),
    mutationFn: (input) => apiClient.post<InventoryCalendarEquipment>(
      "/inventory/calendar-equipment",
      input,
      undefined,
      inventoryEquipmentContract,
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useCalendarBookingRuleResources(
  ruleId: number | null,
  enabled = true,
) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.requirements(
      scope.orgId,
      scope.userId,
      scope.membershipId,
      scope.accessVersion,
      scope.canRead,
      ruleId ?? 0,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<BookingRuleResource[]>(
        `/calendar/booking-rules/${ruleId}/resources`,
        undefined,
        signal,
        requirementsContract,
      ),
    enabled: enabled && ruleId !== null && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarBookingAllocations(bookingId: string) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.allocations(
      scope.orgId,
      scope.userId,
      scope.membershipId,
      scope.accessVersion,
      scope.canRead,
      bookingId,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<BookingAllocation[]>(
        `/calendar/resources/bookings/${encodeURIComponent(bookingId)}/allocations`,
        undefined,
        signal,
        allocationsContract,
      ),
    enabled: Boolean(scope.orgId && scope.userId && bookingId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function usePendingCalendarBookingAllocations(
  cursor: string | null = null,
  enabled = true,
) {
  const scope = useBookingScope();
  const { data: accessSnapshot, isError: accessError } = useAccess();
  const queryClient = useQueryClient();
  const access = permissionGate(
    "calendar:admin:manage",
    canManageResourceApprovals(accessSnapshot),
    accessSnapshot !== undefined,
    accessError,
  );
  const query = useQuery({
    queryKey: calendarBookingQueryKeys.pendingAllocations(
      scope.orgId,
      scope.userId,
      scope.membershipId,
      scope.accessVersion,
      scope.canRead,
      cursor,
    ),
    queryFn: async ({ signal }): Promise<PendingBookingAllocationPage> => {
      try {
        return await apiClient.get<PendingBookingAllocationPage>(
          "/calendar/resources/pending-allocation-pages",
          cursor ? { cursor } : undefined,
          signal,
          pendingAllocationsContract,
        );
      } catch (error) {
        if (!cursor && isApiError(error) && error.status === 404) {
          const items = await apiClient.get<
            PendingBookingAllocationPage["items"]
          >(
            "/calendar/resources/pending-allocations",
            undefined,
            signal,
            legacyPendingAllocationsContract,
          );
          return { items, nextCursor: null };
        }
        throw error;
      }
    },
    enabled: access.allowed && enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    ...INLINE_READ_ERROR,
  });
  const refetch: typeof query.refetch = async (options) => {
    if (access.unavailable)
      await queryClient.refetchQueries({
        queryKey: platformCoreQueryKeys.access.me(),
      });
    return query.refetch(options);
  };
  return gated({ ...query, refetch }, access);
}

export function useResolveCalendarBookingAllocation(bookingId: string) {
  const queryClient = useQueryClient();
  const scope = useBookingScope();
  const { data: access, refetch } = useAccess();
  return useMutation({
    mutationKey: calendarBookingQueryKeys.mutation("resolve-allocation"),
    mutationFn: async ({
      resourceId,
      expectedVersion,
      outcome,
      ownerReceiptId,
      reasonCode,
    }: {
      resourceId: number;
      expectedVersion: number;
      outcome: "approved" | "rejected";
      ownerReceiptId: string;
      reasonCode?: string;
    }) => {
      const resolvedAccess = access ?? (await refetch()).data;
      if (!canManageResourceApprovals(resolvedAccess))
        throw new Error("Missing permission to resolve resource allocations");
      return apiClient.put<BookingAllocationResolution>(
        `/calendar/resources/bookings/${encodeURIComponent(bookingId)}/allocations/${resourceId}`,
        {
          expectedVersion,
          outcome,
          ownerReceiptId,
          ...(reasonCode ? { reasonCode } : {}),
        },
        undefined,
        allocationResolutionContract,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: calendarBookingQueryKeys.allocations(
          scope.orgId,
          scope.userId,
          scope.membershipId,
          scope.accessVersion,
          scope.canRead,
          bookingId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: calendarBookingQueryKeys.all(),
      });
    },
  });
}

export function useCreateCalendarResource() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("create-resource"),
    mutationFn: (input: CalendarResourceInput) =>
      apiClient.post<BookingResource>(
        "/calendar/resources",
        input,
        undefined,
        resourceContract,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: calendarBookingQueryKeys.all(),
      }),
  });
}

export function useUpdateCalendarResource() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("update-resource"),
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: CalendarResourceUpdateInput;
    }) =>
      apiClient.put<BookingResource>(
        `/calendar/resources/${id}`,
        input,
        undefined,
        resourceContract,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: calendarBookingQueryKeys.all(),
      }),
  });
}

export function useAddCalendarResourceMaintenance() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("add-maintenance"),
    mutationFn: ({
      id,
      startAt,
      endAt,
      reason,
    }: {
      id: number;
      startAt: string;
      endAt: string;
      reason: string | null;
    }) =>
      apiClient.post<BookingResourceMaintenance>(
        `/calendar/resources/${id}/maintenance`,
        { startAt, endAt, reason },
        undefined,
        maintenanceContract,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: calendarBookingQueryKeys.all(),
      }),
  });
}
