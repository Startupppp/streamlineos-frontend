"use client";

import { useInfiniteQuery, useQueryClient, type InfiniteData, type Query } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { usePermissionGate, useModuleEnabled } from "@/hooks/api/access";
import { gated } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  OfferFulfillmentComponent,
  OfferFulfillmentPage,
} from "@/hooks/api/crm/offer-fulfillment-schema";

const pageLazy = lazyContract(() =>
  import("@/hooks/api/crm/offer-fulfillment-schema").then((m) => m.offerFulfillmentPageContract),
);
const rowLazy = lazyContract(() =>
  import("@/hooks/api/crm/offer-fulfillment-schema").then((m) => m.offerFulfillmentComponentContract),
);
const deleteLazy = lazyContract(() =>
  import("@/hooks/api/crm/offer-fulfillment-schema").then((m) => m.offerFulfillmentDeleteContract),
);

const keys = usersAndCommerceQueryKeys.crmOfferFulfillment;
type Pages = InfiniteData<OfferFulfillmentPage, string | undefined>;

/** The `GET /offer-fulfillment` query contract (`listOfferFulfillmentQuerySchema`), minus the cursor this hook owns. */
interface OfferFulfillmentFilters {
  crmOfferId?: number;
  invSkuId?: number;
  status?: "active" | "inactive";
  limit?: number;
}

/** Keyset list of CRM product → inventory variant mappings. Needs both CRM and Inventory on (`@RequireModule`). */
export function useOfferFulfillmentMappings(filters: OfferFulfillmentFilters) {
  const access = usePermissionGate("crm:offer-fulfillment:view");
  const inventoryOn = useModuleEnabled("inventory");
  return gated(
    useInfiniteQuery({
      queryKey: keys.list({ ...filters }),
      queryFn: ({ pageParam, signal }) =>
        apiClient.get<OfferFulfillmentPage>(
          "/offer-fulfillment",
          { ...filters, ...(pageParam !== undefined ? { cursor: pageParam } : {}) },
          signal,
          pageLazy,
        ),
      getNextPageParam: (last: OfferFulfillmentPage) => last.pagination.nextCursor ?? undefined,
      initialPageParam: NO_CURSOR_YET,
      staleTime: 30_000,
      enabled: access.allowed && inventoryOn,
    }),
    access,
  );
}

function isFilters(value: unknown): value is OfferFulfillmentFilters {
  return typeof value === "object" && value !== null;
}

/** Whether a cached list (by the filters in its key) would contain this row. */
function listHolds(query: Query, row: OfferFulfillmentComponent): boolean {
  const filters = query.queryKey.at(-1);
  if (!isFilters(filters)) return true;
  if (filters.crmOfferId !== undefined && filters.crmOfferId !== row.crmOfferId) return false;
  if (filters.invSkuId !== undefined && filters.invSkuId !== row.invSkuId) return false;
  return filters.status === undefined || filters.status === row.status;
}

function mapPages(data: Pages | undefined, fn: (rows: OfferFulfillmentComponent[]) => OfferFulfillmentComponent[]) {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, data: fn(page.data) })) };
}

interface CreateOfferFulfillmentInput {
  crmOfferId: number;
  invSkuId: number;
  quantityPerUnit: number;
  uom?: string;
  notes?: string;
}

/** 409 when the product is already mapped to that variant. */
export function useCreateOfferFulfillmentMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:offer-fulfillment:create", {
    mutationKey: ["crm", "offer-fulfillment", "create"] as const,
    mutationFn: (input: CreateOfferFulfillmentInput) =>
      apiClient.post<OfferFulfillmentComponent>("/offer-fulfillment", input, undefined, rowLazy),
    onSuccess: (row) => {
      // The list is newest-first, so the created row leads the first page of every list that holds it.
      qc.setQueriesData<Pages>(
        { queryKey: keys.list(), predicate: (query) => listHolds(query, row) },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page, index) => (index === 0 ? { ...page, data: [row, ...page.data] } : page)),
          },
      );
    },
  });
}

interface UpdateOfferFulfillmentInput {
  offerFulfillmentComponentId: number;
  quantityPerUnit?: number;
  uom?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
}

export function useUpdateOfferFulfillmentMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:offer-fulfillment:update", {
    mutationKey: ["crm", "offer-fulfillment", "update"] as const,
    mutationFn: ({ offerFulfillmentComponentId, ...patch }: UpdateOfferFulfillmentInput) =>
      apiClient.patch<OfferFulfillmentComponent>(
        `/offer-fulfillment/${offerFulfillmentComponentId}`,
        patch,
        undefined,
        rowLazy,
      ),
    onSuccess: (row) => {
      qc.setQueriesData<Pages>({ queryKey: keys.list() }, (data) =>
        mapPages(data, (rows) =>
          rows.map((r) => (r.offerFulfillmentComponentId === row.offerFulfillmentComponentId ? row : r)),
        ),
      );
    },
  });
}

export function useDeleteOfferFulfillmentMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:offer-fulfillment:delete", {
    mutationKey: ["crm", "offer-fulfillment", "delete"] as const,
    mutationFn: (offerFulfillmentComponentId: number) =>
      apiClient.delete<{ success: true }>(
        `/offer-fulfillment/${offerFulfillmentComponentId}`,
        undefined,
        undefined,
        deleteLazy,
      ),
    onSuccess: (_result, offerFulfillmentComponentId) => {
      qc.setQueriesData<Pages>({ queryKey: keys.list() }, (data) =>
        mapPages(data, (rows) => rows.filter((r) => r.offerFulfillmentComponentId !== offerFulfillmentComponentId)),
      );
    },
  });
}
