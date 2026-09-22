import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { CursorPageResponse, Ticket } from "@/types/projects";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

export type TicketCollection =
  | CursorPageResponse<Ticket>
  | InfiniteData<CursorPageResponse<Ticket>>;
export type TicketSnapshots = {
  key: readonly unknown[];
  previous: Ticket[];
  optimistic: Ticket[];
}[];

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

export function rollbackTicketFields<T extends object>(
  current: T,
  previous: T,
  optimistic: T,
): T {
  const restored = { ...current };
  for (const field in optimistic)
    if (
      !Object.is(previous[field], optimistic[field]) &&
      Object.is(current[field], optimistic[field])
    )
      restored[field] = previous[field];
  return restored;
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
      ? rollbackTicketFields(current, before, after)
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

export function invalidateBuildViews(
  client: QueryClient,
  projectId: number,
  ticketIds: number[] = [],
  aggregates = true,
) {
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.detail(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.list(),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
  });
  void client.invalidateQueries({
    queryKey:
      accountingAndSupportQueryKeys.projectReports.criticalPath(projectId),
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.recentProjects(),
  });
  for (const ticketId of ticketIds) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projects.ticket(ticketId),
    });
    void client.invalidateQueries({
      queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    });
  }
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.tickets(),
    predicate: (query) =>
      query.queryKey.includes("by-key") && query.queryKey.includes(projectId),
  });
  if (!aggregates) return;
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.cycles(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
  });
  void client.invalidateQueries({
    queryKey: accountingAndSupportQueryKeys.projectReports.all,
    predicate: (query) =>
      query.queryKey[
        accountingAndSupportQueryKeys.projectReports.all.length + 1
      ] === projectId,
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.activeSprintSummary(),
  });
}

export function invalidateTicketUpdateViews(
  client: QueryClient,
  projectId: number,
  ticketId: number,
  changes: {
    status?: unknown;
    cycleId?: unknown;
    points?: unknown;
    startDate?: unknown;
    dueDate?: unknown;
    assigneeId?: unknown;
    assigneeIds?: unknown;
  },
) {
  void client.invalidateQueries({
    queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    exact: true,
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.list(),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
    refetchType: "none",
  });

  const affectsPlanning =
    changes.status !== undefined ||
    changes.cycleId !== undefined ||
    changes.points !== undefined ||
    changes.startDate !== undefined ||
    changes.dueDate !== undefined;

  if (!affectsPlanning) return;

  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.cycles(projectId),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey:
      accountingAndSupportQueryKeys.projectReports.criticalPath(projectId),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: accountingAndSupportQueryKeys.projectReports.all,
    refetchType: "none",
    predicate: (query) =>
      query.queryKey[
        accountingAndSupportQueryKeys.projectReports.all.length + 1
      ] === projectId,
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.activeSprintSummary(),
    refetchType: "none",
  });
}
