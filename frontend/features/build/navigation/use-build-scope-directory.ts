"use client";

import { useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import {
  useManagedProducts,
  useInfiniteManagedProducts,
} from "@/hooks/api/build/managed-products";
import {
  usePmWorkspaces,
  useInfinitePmWorkspaces,
} from "@/hooks/api/build/pm-workspaces";
import { useCanState } from "@/hooks/api/access";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
import {
  resolveLinkedProjectParentPath,
  detectsQuarantinedProduct,
  detectsQuarantinedProject,
} from "./build-scope-tree";
import type { BuildScopeRef } from "./use-build-nav-preferences";

export const BUILD_SCOPE_SEARCH_DEBOUNCE_MS = 300;
export const BUILD_SCOPE_PAGE_LIMIT = 100;

export const ORGANIZATION_SCOPE_REF: BuildScopeRef = {
  key: "organization",
  type: "organization",
  id: "organization",
  name: "All of Build",
  parentPath: null,
  parentKey: null,
  projectKey: null,
  href: `${BUILD_ROOT_PATH}/command-center`,
};

export interface BuildScopeDirectoryEntry extends BuildScopeRef {
  isArchived: boolean;
}

export interface BuildScopeDirectory {
  workspaces: BuildScopeDirectoryEntry[];
  products: BuildScopeDirectoryEntry[];
  projects: BuildScopeDirectoryEntry[];
  quarantinedProducts: BuildScopeDirectoryEntry[];
  quarantinedProjects: BuildScopeDirectoryEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  isDenied: boolean;
  hasMoreProjects: boolean;
  isFetchingMoreProjects: boolean;
  fetchMoreProjects: () => void;
  hasMoreHierarchy: boolean;
  isFetchingMoreHierarchy: boolean;
  fetchMoreHierarchy: () => void;
  refetch: () => void;
}

const ORGANIZATION_PARENT = "Organization";

export function useBuildScopeDirectory(
  search: string,
  includeArchived: boolean,
): BuildScopeDirectory {
  const canViewState = useCanState("build:view");
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    BUILD_SCOPE_SEARCH_DEBOUNCE_MS,
  );
  const searchParam =
    debouncedSearch.length > 0 ? { search: debouncedSearch } : {};

  const hierarchyWorkspacesQuery = usePmWorkspaces({
    limit: BUILD_SCOPE_PAGE_LIMIT,
  });
  const hierarchyProductsQuery = useManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
  });

  const wsInfinite = useInfinitePmWorkspaces({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });
  const productsInfinite = useInfiniteManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });

  const projectsInfiniteQuery = useInfiniteProjects({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
    ...(includeArchived ? { status: "ALL" as const } : {}),
  });

  const workspaceNames = useMemo(() => {
    const rows = hierarchyWorkspacesQuery.data?.data ?? [];
    return new Map(rows.map((row) => [row.pmWorkspaceId, row.name]));
  }, [hierarchyWorkspacesQuery.data]);

  const productNames = useMemo(() => {
    const rows = hierarchyProductsQuery.data?.data ?? [];
    return new Map(rows.map((row) => [row.id, row.name]));
  }, [hierarchyProductsQuery.data]);

  const productWorkspaceIds = useMemo(() => {
    const rows = hierarchyProductsQuery.data?.data ?? [];
    return new Map<number, string | null>(
      rows.map((row) => [row.id, row.pmWorkspaceId]),
    );
  }, [hierarchyProductsQuery.data]);

  const hierarchyIsComplete = useMemo(
    () =>
      hierarchyWorkspacesQuery.isSuccess &&
      hierarchyProductsQuery.isSuccess &&
      !(hierarchyWorkspacesQuery.data?.pagination.hasMore ?? false) &&
      !(hierarchyProductsQuery.data?.pagination.hasMore ?? false),
    [
      hierarchyWorkspacesQuery.isSuccess,
      hierarchyWorkspacesQuery.data,
      hierarchyProductsQuery.isSuccess,
      hierarchyProductsQuery.data,
    ],
  );

  const workspaces = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = wsInfinite.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
      .map((row) => ({
        key: `workspace:${row.pmWorkspaceId}`,
        type: "workspace" as const,
        id: row.pmWorkspaceId,
        name: row.name,
        parentPath: ORGANIZATION_PARENT,
        parentKey: null,
        projectKey: null,
        href: `${BUILD_ROOT_PATH}/workspaces/${row.pmWorkspaceId}`,
        isArchived: row.status === "archived",
      }));
  }, [wsInfinite.data, includeArchived]);

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = productsInfinite.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
      .filter(
        (row) =>
          !detectsQuarantinedProduct(
            row.pmWorkspaceId,
            workspaceNames,
            hierarchyIsComplete,
          ),
      )
      .map((row) => ({
        key: `product:${row.id}`,
        type: "product" as const,
        id: String(row.id),
        name: row.name,
        parentPath:
          row.pmWorkspaceId === null
            ? ORGANIZATION_PARENT
            : (workspaceNames.get(row.pmWorkspaceId) ?? ORGANIZATION_PARENT),
        parentKey:
          row.pmWorkspaceId === null ? null : `workspace:${row.pmWorkspaceId}`,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/managed-products/${row.id}`,
        isArchived: row.status === "archived",
      }));
  }, [productsInfinite.data, includeArchived, workspaceNames, hierarchyIsComplete]);

  const quarantinedProducts = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (!hierarchyIsComplete) return [];
    const rows = productsInfinite.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
      .filter((row) =>
        detectsQuarantinedProduct(
          row.pmWorkspaceId,
          workspaceNames,
          hierarchyIsComplete,
        ),
      )
      .map((row) => ({
        key: `product:${row.id}`,
        type: "product" as const,
        id: String(row.id),
        name: row.name,
        parentPath: ORGANIZATION_PARENT,
        parentKey: null,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/managed-products/${row.id}`,
        isArchived: row.status === "archived",
      }));
  }, [productsInfinite.data, includeArchived, workspaceNames, hierarchyIsComplete]);

  const projects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = projectsInfiniteQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .filter(
        (row) =>
          !detectsQuarantinedProject(
            row.managedProductId,
            productNames,
            productWorkspaceIds,
            workspaceNames,
            hierarchyIsComplete,
          ),
      )
      .map((row) => {
        const productName =
          row.managedProductId !== null
            ? productNames.get(row.managedProductId)
            : undefined;
        const productWorkspaceId =
          row.managedProductId !== null
            ? (productWorkspaceIds.get(row.managedProductId) ?? null)
            : null;
        const workspaceName =
          productWorkspaceId !== null
            ? workspaceNames.get(productWorkspaceId)
            : undefined;
        return {
          key: `project:${row.id}`,
          type: "project" as const,
          id: String(row.id),
          name: row.name,
          parentPath:
            row.managedProductId !== null
              ? resolveLinkedProjectParentPath(productName, workspaceName)
              : row.pmWorkspaceId === undefined
                ? ORGANIZATION_PARENT
                : (workspaceNames.get(row.pmWorkspaceId) ?? ORGANIZATION_PARENT),
          parentKey:
            row.managedProductId !== null
              ? `product:${row.managedProductId}`
              : row.pmWorkspaceId === undefined
                ? null
                : `workspace:${row.pmWorkspaceId}`,
          projectKey: row.key,
          href: `${BUILD_ROOT_PATH}/${row.id}`,
          isArchived: row.status === "ARCHIVED",
        };
      });
  }, [
    projectsInfiniteQuery.data,
    includeArchived,
    productNames,
    productWorkspaceIds,
    workspaceNames,
    hierarchyIsComplete,
  ]);

  const quarantinedProjects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (!hierarchyIsComplete) return [];
    const rows = projectsInfiniteQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .filter((row) =>
        detectsQuarantinedProject(
          row.managedProductId,
          productNames,
          productWorkspaceIds,
          workspaceNames,
          hierarchyIsComplete,
        ),
      )
      .map((row) => ({
        key: `project:${row.id}`,
        type: "project" as const,
        id: String(row.id),
        name: row.name,
        parentPath: ORGANIZATION_PARENT,
        parentKey: null,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/${row.id}`,
        isArchived: row.status === "ARCHIVED",
      }));
  }, [
    projectsInfiniteQuery.data,
    includeArchived,
    productNames,
    productWorkspaceIds,
    workspaceNames,
    hierarchyIsComplete,
  ]);

  const hasMoreHierarchy =
    (wsInfinite.hasNextPage ?? false) || (productsInfinite.hasNextPage ?? false);

  const handleFetchMoreProjects = useCallback(() => {
    void projectsInfiniteQuery.fetchNextPage();
  }, [projectsInfiniteQuery.fetchNextPage]);

  const handleFetchMoreHierarchy = useCallback(() => {
    void wsInfinite.fetchNextPage();
    void productsInfinite.fetchNextPage();
  }, [wsInfinite.fetchNextPage, productsInfinite.fetchNextPage]);

  function handleRefetch() {
    void hierarchyWorkspacesQuery.refetch();
    void hierarchyProductsQuery.refetch();
    void wsInfinite.refetch();
    void productsInfinite.refetch();
    void projectsInfiniteQuery.refetch();
  }

  return {
    workspaces,
    products,
    projects,
    quarantinedProducts,
    quarantinedProjects,
    isLoading:
      canViewState === "loading" ||
      wsInfinite.isLoading ||
      productsInfinite.isLoading ||
      projectsInfiniteQuery.isLoading,
    isRefreshing:
      (wsInfinite.isFetching && !wsInfinite.isLoading && !wsInfinite.isFetchingNextPage) ||
      (productsInfinite.isFetching && !productsInfinite.isLoading && !productsInfinite.isFetchingNextPage) ||
      (projectsInfiniteQuery.isFetching &&
        !projectsInfiniteQuery.isLoading &&
        !projectsInfiniteQuery.isFetchingNextPage),
    isError:
      wsInfinite.isError || productsInfinite.isError || projectsInfiniteQuery.isError,
    isDenied: canViewState === "denied",
    hasMoreProjects: projectsInfiniteQuery.hasNextPage ?? false,
    isFetchingMoreProjects: projectsInfiniteQuery.isFetchingNextPage,
    fetchMoreProjects: handleFetchMoreProjects,
    hasMoreHierarchy,
    isFetchingMoreHierarchy:
      wsInfinite.isFetchingNextPage || productsInfinite.isFetchingNextPage,
    fetchMoreHierarchy: handleFetchMoreHierarchy,
    refetch: handleRefetch,
  };
}
