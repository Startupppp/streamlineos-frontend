"use client";

import { useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import {
  useManagedProducts,
  useInfiniteManagedProducts,
} from "@/hooks/api/build/managed-products";
import { useCanState } from "@/hooks/api/access";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
import {
  resolveLinkedProjectParentPath,
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
  products: BuildScopeDirectoryEntry[];
  projects: BuildScopeDirectoryEntry[];
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

  const hierarchyProductsQuery = useManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
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

  const productNames = useMemo(() => {
    const rows = hierarchyProductsQuery.data?.data ?? [];
    return new Map(rows.map((row) => [row.id, row.name]));
  }, [hierarchyProductsQuery.data]);

  const hierarchyIsComplete = useMemo(
    () =>
      hierarchyProductsQuery.isSuccess &&
      !(hierarchyProductsQuery.data?.pagination.hasMore ?? false),
    [hierarchyProductsQuery.isSuccess, hierarchyProductsQuery.data],
  );

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = productsInfinite.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
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
  }, [productsInfinite.data, includeArchived]);

  const projects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = projectsInfiniteQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .filter(
        (row) =>
          !detectsQuarantinedProject(
            row.managedProductId,
            productNames,
            hierarchyIsComplete,
          ),
      )
      .map((row) => {
        const productName =
          row.managedProductId !== null
            ? productNames.get(row.managedProductId)
            : undefined;
        return {
          key: `project:${row.id}`,
          type: "project" as const,
          id: String(row.id),
          name: row.name,
          parentPath: resolveLinkedProjectParentPath(productName),
          parentKey:
            row.managedProductId !== null
              ? `product:${row.managedProductId}`
              : null,
          projectKey: row.key,
          href: `${BUILD_ROOT_PATH}/${row.id}`,
          isArchived: row.status === "ARCHIVED",
        };
      });
  }, [projectsInfiniteQuery.data, includeArchived, productNames, hierarchyIsComplete]);

  const quarantinedProjects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (!hierarchyIsComplete) return [];
    const rows = projectsInfiniteQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .filter((row) =>
        detectsQuarantinedProject(row.managedProductId, productNames, hierarchyIsComplete),
      )
      .map((row) => ({
        key: `project:${row.id}`,
        type: "project" as const,
        id: String(row.id),
        name: row.name,
        parentPath: null,
        parentKey: null,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/${row.id}`,
        isArchived: row.status === "ARCHIVED",
      }));
  }, [projectsInfiniteQuery.data, includeArchived, productNames, hierarchyIsComplete]);

  const hasMoreHierarchy = productsInfinite.hasNextPage ?? false;

  const handleFetchMoreProjects = useCallback(() => {
    void projectsInfiniteQuery.fetchNextPage();
  }, [projectsInfiniteQuery.fetchNextPage]);

  const handleFetchMoreHierarchy = useCallback(() => {
    void productsInfinite.fetchNextPage();
  }, [productsInfinite.fetchNextPage]);

  function handleRefetch() {
    void hierarchyProductsQuery.refetch();
    void productsInfinite.refetch();
    void projectsInfiniteQuery.refetch();
  }

  return {
    products,
    projects,
    quarantinedProjects,
    isLoading:
      canViewState === "loading" ||
      productsInfinite.isLoading ||
      projectsInfiniteQuery.isLoading,
    isRefreshing:
      (productsInfinite.isFetching && !productsInfinite.isLoading && !productsInfinite.isFetchingNextPage) ||
      (projectsInfiniteQuery.isFetching &&
        !projectsInfiniteQuery.isLoading &&
        !projectsInfiniteQuery.isFetchingNextPage),
    isError: productsInfinite.isError || projectsInfiniteQuery.isError,
    isDenied: canViewState === "denied",
    hasMoreProjects: projectsInfiniteQuery.hasNextPage ?? false,
    isFetchingMoreProjects: projectsInfiniteQuery.isFetchingNextPage,
    fetchMoreProjects: handleFetchMoreProjects,
    hasMoreHierarchy,
    isFetchingMoreHierarchy: productsInfinite.isFetchingNextPage,
    fetchMoreHierarchy: handleFetchMoreHierarchy,
    refetch: handleRefetch,
  };
}
