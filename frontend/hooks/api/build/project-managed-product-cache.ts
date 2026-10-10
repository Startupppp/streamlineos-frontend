import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  ProjectFilters,
  ProjectListItem,
  ProjectListResponse,
  ProjectWithDetails,
} from "@/types/projects";

type ProjectListCache = ProjectListResponse | InfiniteData<ProjectListResponse>;

function matchesFilters(project: ProjectListItem, filters: ProjectFilters): boolean {
  const search = filters.search?.trim().toLocaleLowerCase();
  if (search && !`${project.name} ${project.key}`.toLocaleLowerCase().includes(search)) return false;
  if (filters.status && filters.status !== "ALL" && project.status !== filters.status) return false;
  if (filters.managerId && project.manager?.id !== filters.managerId) return false;
  if (filters.health && project.health !== filters.health) return false;
  if (filters.startAfter && (!project.startDate || new Date(project.startDate).getTime() < new Date(filters.startAfter).getTime())) return false;
  if (filters.endBefore && (!project.endDate || new Date(project.endDate).getTime() > new Date(filters.endBefore).getTime())) return false;
  return true;
}

function patchPage(
  page: ProjectListResponse,
  project: ProjectListItem,
  managedProductId: number,
  filters: ProjectFilters,
  canInsert: boolean,
): ProjectListResponse {
  const belongsToList = filters.managedProductId === undefined || filters.managedProductId === managedProductId;
  const rows = page.data.flatMap((row) =>
    row.id !== project.id ? [row] : belongsToList ? [{ ...row, managedProductId }] : [],
  );
  if (
    !canInsert ||
    filters.managedProductId !== managedProductId ||
    rows.some((row) => row.id === project.id) ||
    !matchesFilters(project, filters)
  ) {
    return { ...page, data: rows };
  }

  // First pages are ID-descending. If the new ID falls after an unseen cursor,
  // leave this page alone; it will be loaded from the server when reached.
  const lastRow = rows.at(-1);
  if (page.hasMore && lastRow && project.id < lastRow.id) {
    return { ...page, data: rows };
  }
  const sorted = [...rows, { ...project, managedProductId }].sort((a, b) => b.id - a.id);
  const limit = filters.limit ?? (page.hasMore ? page.data.length : sorted.length);
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
  for (const [key, cached] of queryClient.getQueriesData<ProjectListCache>({ queryKey: listPrefix })) {
    if (!cached) continue;
    const filters = (key[listPrefix.length] ?? {}) as ProjectFilters;
    const canInsert = filters.afterId === undefined && filters.sort === undefined;
    if ("pages" in cached) {
      const pages = cached.pages.map((page, index) =>
        patchPage(page, project, managedProductId, filters, canInsert && cached.pages.length === 1 && index === 0),
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
    (detail) => detail ? { ...detail, managedProductId } : detail,
  );
}
