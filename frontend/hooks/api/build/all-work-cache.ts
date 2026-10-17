import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  AllWorkTicket,
  CursorPaginatedResponse,
} from "@/types/projects";
import { rollbackOptimisticFields } from "./optimistic-cache-rollback";
import {
  allWorkFamily,
  filtersForKey,
  matchesSafeFilters,
  orderChanged,
  relevantServerPredicateChanged,
} from "./all-work-cache-filters";
export type AllWorkCollection =
  | CursorPaginatedResponse<AllWorkTicket>
  | InfiniteData<CursorPaginatedResponse<AllWorkTicket>>;
export type AllWorkSnapshots = {
  key: readonly unknown[];
  previous: AllWorkCollection;
  optimistic: AllWorkCollection;
  revalidate: boolean;
}[];
export function isAllWorkCollection(
  value: unknown,
): value is AllWorkCollection {
  if (!value || typeof value !== "object") return false;
  const isTicketArray = (data: unknown) =>
    Array.isArray(data) &&
    data.every(
      (ticket) =>
        ticket &&
        typeof ticket === "object" &&
        "id" in ticket &&
        "projectId" in ticket &&
        "version" in ticket,
    );
  if ("data" in value) return isTicketArray(value.data);
  return (
    "pages" in value &&
    Array.isArray(value.pages) &&
    value.pages.every(
      (page) =>
        page &&
        typeof page === "object" &&
        "data" in page &&
        isTicketArray(page.data),
    )
  );
}
export function allWorkTickets(collection: AllWorkCollection): AllWorkTicket[] {
  return "pages" in collection
    ? collection.pages.flatMap((page) => page.data)
    : collection.data;
}
function collectionCapacity(collection: AllWorkCollection): number {
  if (!("pages" in collection))
    return Math.max(collection.data.length, collection.limit ?? 0);
  return collection.pages.reduce(
    (capacity, page) => capacity + Math.max(page.data.length, page.limit ?? 0),
    0,
  );
}
function replaceTickets(
  collection: AllWorkCollection,
  tickets: AllWorkTicket[],
  totalDelta = 0,
): AllWorkCollection {
  const updateTotal = <T extends CursorPaginatedResponse<AllWorkTicket>>(
    page: T,
  ): T =>
    typeof page.total === "number"
      ? { ...page, total: Math.max(0, page.total + totalDelta) }
      : page;
  if (!("pages" in collection))
    return updateTotal({ ...collection, data: tickets });
  let offset = 0;
  return {
    ...collection,
    pages: collection.pages.map((page, index) => {
      const remaining = tickets.length - offset;
      const size =
        index === collection.pages.length - 1
          ? Math.max(page.data.length, remaining)
          : page.data.length;
      const data = tickets.slice(offset, offset + size);
      offset += data.length;
      return updateTotal({ ...page, data });
    }),
  };
}
export function patchAllWorkCollections(
  client: QueryClient,
  projectId: number,
  patch: (ticket: AllWorkTicket) => AllWorkTicket,
): AllWorkSnapshots {
  const collections = client
    .getQueriesData<unknown>({
      queryKey: buildWorkQueryKeys.projects.allWorkAll,
    })
    .flatMap(([key, value]) =>
      isAllWorkCollection(value) ? [{ key, value }] : [],
    );
  const sources = new Map<string, Map<number, AllWorkTicket>>();
  for (const { key, value } of collections) {
    const filters = filtersForKey(key);
    const id = allWorkFamily(key, filters);
    const tickets = sources.get(id) ?? new Map();
    for (const ticket of allWorkTickets(value))
      if (ticket.projectId === projectId) tickets.set(ticket.id, ticket);
    sources.set(id, tickets);
  }
  return collections.map(({ key, value }) => {
    const filters = filtersForKey(key);
    const id = allWorkFamily(key, filters);
    const current = allWorkTickets(value);
    const present = new Set(current.map((ticket) => ticket.id));
    const pairs = current
      .filter((ticket) => ticket.projectId === projectId)
      .map((ticket) => ({ before: ticket, after: patch(ticket) }));
    const patchedById = new Map(pairs.map(({ after }) => [after.id, after]));
    const candidates = filters.status
      ? [...(sources.get(id)?.values() ?? [])]
          .filter((ticket) => !present.has(ticket.id))
          .map(patch)
          .filter((ticket) => matchesSafeFilters(ticket, filters))
      : [];
    const retained = current
      .map((ticket) => patchedById.get(ticket.id) ?? ticket)
      .filter(
        (ticket) =>
          ticket.projectId !== projectId || matchesSafeFilters(ticket, filters),
      );
    const unbounded = [...candidates, ...retained];
    const totalDelta = unbounded.length - current.length;
    const optimistic = replaceTickets(
      value,
      unbounded.slice(0, collectionCapacity(value)),
      totalDelta,
    );
    client.setQueryData<AllWorkCollection>(key, optimistic);
    return {
      key,
      previous: value,
      optimistic,
      revalidate:
        relevantServerPredicateChanged(filters, pairs) ||
        totalDelta !== 0 ||
        orderChanged(filters, pairs),
    };
  });
}
export function restoreAllWorkCollections(
  client: QueryClient,
  snapshots: AllWorkSnapshots,
): void {
  for (const { key, previous, optimistic } of snapshots) {
    const previousTickets = allWorkTickets(previous);
    const optimisticTickets = allWorkTickets(optimistic);
    const previousById = new Map(
      previousTickets.map((ticket) => [ticket.id, ticket]),
    );
    const optimisticById = new Map(
      optimisticTickets.map((ticket) => [ticket.id, ticket]),
    );
    const changedIds = new Set(
      [...new Set([...previousById.keys(), ...optimisticById.keys()])].filter(
        (id) =>
          JSON.stringify(previousById.get(id)) !==
          JSON.stringify(optimisticById.get(id)),
      ),
    );
    client.setQueryData<AllWorkCollection>(key, (current) => {
      if (!current) return current;
      const currentById = new Map(
        allWorkTickets(current).map((ticket) => [ticket.id, ticket]),
      );
      let totalDelta = 0;
      for (const id of changedIds) {
        const prior = previousById.get(id);
        const optimisticTicket = optimisticById.get(id);
        const currentTicket = currentById.get(id);
        if (prior && optimisticTicket && currentTicket) {
          currentById.set(
            id,
            rollbackOptimisticFields(currentTicket, prior, optimisticTicket),
          );
        } else if (prior && !optimisticTicket && !currentTicket) {
          currentById.set(id, prior);
          totalDelta += 1;
        } else if (
          !prior &&
          optimisticTicket &&
          JSON.stringify(currentTicket) === JSON.stringify(optimisticTicket)
        ) {
          currentById.delete(id);
          totalDelta -= 1;
        }
      }
      const priorOrder = new Map(
        previousTickets.map((ticket, index) => [ticket.id, index]),
      );
      const restored = [...currentById.values()].sort((left, right) => {
        const leftIndex = priorOrder.get(left.id);
        const rightIndex = priorOrder.get(right.id);
        if (leftIndex === undefined && rightIndex === undefined) return 0;
        if (leftIndex === undefined) return 1;
        if (rightIndex === undefined) return -1;
        return leftIndex - rightIndex;
      });
      return replaceTickets(current, restored, totalDelta);
    });
  }
}
export function revalidateAllWorkCollections(
  client: QueryClient,
  snapshots: AllWorkSnapshots,
): void {
  for (const { key, revalidate } of snapshots)
    if (revalidate)
      void client.invalidateQueries({
        queryKey: key,
        exact: true,
        refetchType: "none",
      });
}
