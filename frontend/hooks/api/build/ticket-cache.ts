import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  CursorPageResponse,
  ProjectWithDetails,
  Ticket,
} from "@/types/projects";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { allWorkTickets, isAllWorkCollection } from "./all-work-cache";
import { rollbackOptimisticFields } from "./optimistic-cache-rollback";
export {
  patchAllWorkCollections,
  restoreAllWorkCollections,
  revalidateAllWorkCollections,
} from "./all-work-cache";
export type { AllWorkSnapshots } from "./all-work-cache";
export { rollbackOptimisticFields as rollbackTicketFields } from "./optimistic-cache-rollback";

type TicketCollection =
  | CursorPageResponse<Ticket>
  | InfiniteData<CursorPageResponse<Ticket>>;
export type TicketSnapshots = {
  key: readonly unknown[];
  previous: Ticket[];
  optimistic: Ticket[];
}[];
export type RawCollectionSnapshot = {
  key: readonly unknown[];
  data: TicketCollection;
};

function collectionTickets(collection: TicketCollection): Ticket[] {
  return "pages" in collection
    ? collection.pages.flatMap((page) => page.data)
    : collection.data;
}

function mapCollection(
  collection: TicketCollection,
  patch: (ticket: Ticket) => Ticket,
): TicketCollection {
  return "pages" in collection
    ? {
        ...collection,
        pages: collection.pages.map((page) => ({
          ...page,
          data: page.data.map(patch),
        })),
      }
    : { ...collection, data: collection.data.map(patch) };
}

export function ticketRollback<T extends { id: number }>(
  previous: T[],
  optimistic: T[],
): (current: T) => T {
  const previousById = new Map(previous.map((ticket) => [ticket.id, ticket]));
  const optimisticById = new Map(
    optimistic.map((ticket) => [ticket.id, ticket]),
  );
  return (current) => {
    const before = previousById.get(current.id);
    const after = optimisticById.get(current.id);
    return before && after
      ? rollbackOptimisticFields(current, before, after)
      : current;
  };
}

export function patchTicketCollections(
  client: QueryClient,
  projectId: number,
  patch: (ticket: Ticket) => Ticket,
): TicketSnapshots {
  const snapshots: TicketSnapshots = [];
  for (const [key, collection] of client.getQueriesData<TicketCollection>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  })) {
    if (!collection) continue;
    const optimistic = client.setQueryData<TicketCollection>(
      key,
      mapCollection(collection, patch),
    );
    if (optimistic)
      snapshots.push({
        key,
        previous: collectionTickets(collection),
        optimistic: collectionTickets(optimistic),
      });
  }
  return snapshots;
}

export function resolveTicketVersions(
  client: QueryClient,
  projectId: number,
  ticketIds: number[],
): { versions: Record<string, number>; missingTicketIds: number[] } {
  const foundVersions = new Map<number, number>();
  for (const [, collection] of client.getQueriesData<TicketCollection>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  })) {
    if (!collection) continue;
    for (const ticket of collectionTickets(collection)) {
      if (!foundVersions.has(ticket.id))
        foundVersions.set(ticket.id, ticket.version);
    }
  }
  for (const [, value] of client.getQueriesData<unknown>({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
  })) {
    if (!isAllWorkCollection(value)) continue;
    for (const ticket of allWorkTickets(value)) {
      if (ticket.projectId === projectId && !foundVersions.has(ticket.id)) {
        foundVersions.set(ticket.id, ticket.version);
      }
    }
  }
  const detail = client.getQueryData<ProjectWithDetails | null>(
    buildWorkQueryKeys.projects.detail(projectId),
  );
  for (const ticket of detail?.tickets ?? []) {
    if (!foundVersions.has(ticket.id))
      foundVersions.set(ticket.id, ticket.version);
  }
  for (const ticketId of ticketIds) {
    if (foundVersions.has(ticketId)) continue;
    const cachedTicket = client.getQueryData<Ticket | null>(
      buildWorkQueryKeys.projects.ticket(projectId, ticketId),
    );
    if (cachedTicket) foundVersions.set(ticketId, cachedTicket.version);
  }
  const versions: Record<string, number> = {};
  const missingTicketIds: number[] = [];
  for (const ticketId of ticketIds) {
    const version = foundVersions.get(ticketId);
    if (version === undefined) missingTicketIds.push(ticketId);
    else versions[ticketId] = version;
  }
  return { versions, missingTicketIds };
}

export function resolveTicketStatus(
  client: QueryClient,
  projectId: number,
  ticketId: number,
): string | undefined {
  const single = client.getQueryData<Ticket | null>(
    buildWorkQueryKeys.projects.ticket(projectId, ticketId),
  );
  if (single) return single.status;
  for (const [, collection] of client.getQueriesData<TicketCollection>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  })) {
    const found =
      collection &&
      collectionTickets(collection).find((ticket) => ticket.id === ticketId);
    if (found) return found.status;
  }
  for (const [, value] of client.getQueriesData<unknown>({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
  })) {
    if (!isAllWorkCollection(value)) continue;
    const found = allWorkTickets(value).find(
      (ticket) => ticket.projectId === projectId && ticket.id === ticketId,
    );
    if (found) return found.status;
  }
  return undefined;
}

export function restoreTicketCollections(
  client: QueryClient,
  snapshots: TicketSnapshots,
) {
  for (const { key, previous, optimistic } of snapshots) {
    const restore = ticketRollback(previous, optimistic);
    client.setQueryData<TicketCollection>(key, (current) =>
      current ? mapCollection(current, restore) : current,
    );
  }
}

export function snapshotTicketCollections(
  client: QueryClient,
  projectId: number,
): RawCollectionSnapshot[] {
  return client
    .getQueriesData<TicketCollection>({
      queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
    })
    .flatMap(([key, data]) => (data ? [{ key, data }] : []));
}

export function restoreRawCollections(
  client: QueryClient,
  snapshots: RawCollectionSnapshot[],
): void {
  for (const { key, data } of snapshots) {
    client.setQueryData(key, data);
  }
}

export function addTicketToCollections(
  client: QueryClient,
  projectId: number,
  ticket: Ticket,
): TicketSnapshots {
  const snapshots: TicketSnapshots = [];
  for (const [key, collection] of client.getQueriesData<TicketCollection>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  })) {
    if (!collection) continue;
    const previous = collectionTickets(collection);
    const updated = prependTicketToCollection(collection, ticket);
    const optimistic = client.setQueryData<TicketCollection>(key, updated);
    if (optimistic)
      snapshots.push({
        key,
        previous,
        optimistic: collectionTickets(optimistic),
      });
  }
  return snapshots;
}

function prependTicketToCollection(
  collection: TicketCollection,
  ticket: Ticket,
): TicketCollection {
  if ("pages" in collection) {
    if (collection.pages.length === 0) return collection;
    const [first, ...rest] = collection.pages;
    return {
      ...collection,
      pages: [{ ...first, data: [ticket, ...first.data] }, ...rest],
    };
  }
  return { ...collection, data: [ticket, ...collection.data] };
}

export function removeTicketFromCollections(
  client: QueryClient,
  projectId: number,
  ticketId: number,
): void {
  for (const [key, collection] of client.getQueriesData<TicketCollection>({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  })) {
    if (!collection) continue;
    client.setQueryData<TicketCollection>(
      key,
      filterTicketFromCollection(collection, ticketId),
    );
  }
}

function filterTicketFromCollection(
  collection: TicketCollection,
  ticketId: number,
): TicketCollection {
  const keep = (t: Ticket) => t.id !== ticketId;
  if ("pages" in collection)
    return {
      ...collection,
      pages: collection.pages.map((p) => ({ ...p, data: p.data.filter(keep) })),
    };
  return { ...collection, data: collection.data.filter(keep) };
}
