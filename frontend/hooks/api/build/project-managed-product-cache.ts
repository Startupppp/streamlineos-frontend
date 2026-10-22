import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  ProjectFilters,
  ProjectListItem,
  ProjectListResponse,
  ProjectWithDetails,
} from "@/types/projects";
import type {
  LinkedProjectRow,
  LinkedProjectsPage,
} from "./managed-product-projects";

type ProjectListCache = ProjectListResponse | InfiniteData<ProjectListResponse>;

function matchesFilters(
  project: ProjectListItem,
  filters: ProjectFilters,
): boolean {
  const search = filters.search?.trim().toLocaleLowerCase();
  if (
    search &&
    !`${project.name} ${project.key}`.toLocaleLowerCase().includes(search)
  )
    return false;
  if (
    filters.status &&
    filters.status !== "ALL" &&
    project.status !== filters.status
  )
    return false;
  if (filters.managerId && project.manager?.id !== filters.managerId)
    return false;
  if (filters.health && project.health !== filters.health) return false;
  if (
    filters.startAfter &&
    (!project.startDate ||
      new Date(project.startDate).getTime() <
        new Date(filters.startAfter).getTime())
  )
    return false;
  if (
    filters.endBefore &&
    (!project.endDate ||
      new Date(project.endDate).getTime() >
        new Date(filters.endBefore).getTime())
  )
    return false;
  return true;
}

function patchPage(
  page: ProjectListResponse,
  project: ProjectListItem,
  managedProductId: number,
  filters: ProjectFilters,
  canInsert: boolean,
): ProjectListResponse {
  const belongsToList =
    filters.managedProductId === undefined ||
    filters.managedProductId === managedProductId;
  const rows = page.data.flatMap((row) =>
    row.id !== project.id
      ? [row]
      : belongsToList
        ? [{ ...row, managedProductId }]
        : [],
  );
  if (
    !canInsert ||
    filters.managedProductId !== managedProductId ||
    rows.some((row) => row.id === project.id) ||
    !matchesFilters(project, filters)
  ) {
    return { ...page, data: rows };
  }

  const lastRow = rows.at(-1);
  if (page.hasMore && lastRow && project.id < lastRow.id) {
    return { ...page, data: rows };
  }
  const sorted = [...rows, { ...project, managedProductId }].sort(
    (a, b) => b.id - a.id,
  );
  const limit =
    filters.limit ?? (page.hasMore ? page.data.length : sorted.length);
  const overflow = sorted.length > limit;
  const data = sorted.slice(0, limit);
  const hasMore = page.hasMore || overflow;
  return {
    ...page,
    data,
    hasMore,
    nextCursor: hasMore ? (data.at(-1)?.id ?? null) : page.nextCursor,
  };
}

export function patchManagedProductLinkCache(
  queryClient: QueryClient,
  project: ProjectListItem,
  managedProductId: number,
): void {
  const listPrefix = buildWorkQueryKeys.projects.list();
  for (const [key, cached] of queryClient.getQueriesData<ProjectListCache>({
    queryKey: listPrefix,
  })) {
    if (!cached) continue;
    const filters = (key[listPrefix.length] ?? {}) as ProjectFilters;
    const canInsert =
      filters.afterId === undefined && filters.sort === undefined;
    if ("pages" in cached) {
      const pages = cached.pages.map((page, index) =>
        patchPage(
          page,
          project,
          managedProductId,
          filters,
          canInsert && cached.pages.length === 1 && index === 0,
        ),
      );
      queryClient.setQueryData(key, { ...cached, pages });
    } else {
      queryClient.setQueryData(
        key,
        patchPage(cached, project, managedProductId, filters, canInsert),
      );
    }
  }

  queryClient.setQueryData<ProjectWithDetails | null>(
    buildWorkQueryKeys.projects.detail(project.id),
    (detail) => (detail ? { ...detail, managedProductId } : detail),
  );
}

function isoOrNull(value: string | Date | null): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toLinkedRow(
  project: ProjectListItem,
  now: string,
): LinkedProjectRow | null {
  if (!project.status) return null;
  return {
    id: project.id,
    name: project.name,
    key: project.key,
    status: project.status,
    health: project.health,
    ownerId: null,
    ownerMembershipId: null,
    managerMembershipId: null,
    startDate: isoOrNull(project.startDate),
    endDate: isoOrNull(project.endDate),
    nextMilestone: null,
    nextRelease: null,
    linkedGoals: [],
    contribution: {
      totalTickets: project.progress.total,
      doneTickets: project.progress.done,
      percent: project.progress.total > 0 ? project.progress.percentage : null,
    },
    linkedRoadmapItemCount: 0,
    isPrimary: false,
    revision: 0,
    sourceFreshness: "",
    allowedActions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function isUnfilteredFirstPage(filters: unknown): boolean {
  if (filters === undefined) return true;
  if (typeof filters !== "object" || filters === null) return false;
  return Object.entries(filters).every(
    ([key, value]) => key === "limit" || value === undefined,
  );
}

export function moveLinkedProjectRowCache(
  queryClient: QueryClient,
  project: ProjectListItem,
  managedProductId: number,
): void {
  const previousProductId = project.managedProductId;
  if (previousProductId !== null && previousProductId !== managedProductId) {
    const sourcePrefix =
      buildWorkQueryKeys.projects.managedProducts.linkedProjects(
        previousProductId,
      );
    for (const [key, cached] of queryClient.getQueriesData<LinkedProjectsPage>({
      queryKey: sourcePrefix,
    })) {
      if (!cached) continue;
      queryClient.setQueryData<LinkedProjectsPage>(key, {
        ...cached,
        data: cached.data.filter((row) => row.id !== project.id),
      });
    }
    queryClient.invalidateQueries({
      queryKey:
        buildWorkQueryKeys.projects.managedProducts.insights(previousProductId),
      exact: true,
      refetchType: "none",
    });
  }

  const row = toLinkedRow(project, new Date().toISOString());
  if (!row) return;
  const targetPrefix =
    buildWorkQueryKeys.projects.managedProducts.linkedProjects(
      managedProductId,
    );
  for (const [key, cached] of queryClient.getQueriesData<LinkedProjectsPage>({
    queryKey: targetPrefix,
  })) {
    if (!cached || !isUnfilteredFirstPage(key[targetPrefix.length])) continue;
    if (cached.data.some((existing) => existing.id === project.id)) continue;
    const insertAt = cached.data.findIndex(
      (existing) => existing.id < project.id,
    );
    if (insertAt === -1 && cached.pagination.hasMore) continue;
    const data = [...cached.data];
    data.splice(insertAt === -1 ? data.length : insertAt, 0, row);
    queryClient.setQueryData<LinkedProjectsPage>(key, { ...cached, data });
  }
}
