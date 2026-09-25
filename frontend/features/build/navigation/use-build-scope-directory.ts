"use client";

import { useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { useInfiniteManagedProducts } from "@/hooks/api/build/managed-products";
import {
  useInfiniteBuildScopeSearch,
  type BuildScopeResolvedRef,
} from "@/hooks/api/build/scope-directory";
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
  hasMoreSearchResults: boolean;
  isFetchingMoreSearchResults: boolean;
  fetchMoreSearchResults: () => void;
  refetch: () => void;
}

const ORGANIZATION_PARENT = "Organization";

function directoryEntryFromResolved(
  row: BuildScopeResolvedRef,
): BuildScopeDirectoryEntry {
  return {
    key: row.key,
    type: row.type,
    id: row.id,
    name: row.name,
    parentPath: row.parentPath,
    parentKey: row.parentKey,
    projectKey: row.projectKey,
    href:
      row.type === "product"
        ? `${BUILD_ROOT_PATH}/managed-products/${row.id}`
        : `${BUILD_ROOT_PATH}/${row.id}`,
    isArchived: row.isArchived,
  };
}

export function useBuildScopeDirectory(
  search: string,
  includeArchived: boolean,
): BuildScopeDirectory {
  const canViewState = useCanState("build:view");
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    BUILD_SCOPE_SEARCH_DEBOUNCE_MS,
  );
  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;
  const isDebouncePending = isSearching && trimmedSearch !== debouncedSearch;

  const productsInfinite = useInfiniteManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
  });

  const projectsInfiniteQuery = useInfiniteProjects({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...(includeArchived ? { status: "ALL" as const } : {}),
  });

  const searchQuery = useInfiniteBuildScopeSearch(debouncedSearch, {
    enabled: isSearching && !isDebouncePending,
  });
  const fetchNextProjectPage = projectsInfiniteQuery.fetchNextPage;
  const fetchNextProductPage = productsInfinite.fetchNextPage;
  const fetchNextSearchPage = searchQuery.fetchNextPage;

  const productNames = useMemo(() => {
    const rows = productsInfinite.data?.pages.flatMap((page) => page.data) ?? [];
    return new Map(rows.map((row) => [row.id, row.name]));
  }, [productsInfinite.data]);

  const hierarchyIsComplete = useMemo(
    () => productsInfinite.isSuccess && productsInfinite.hasNextPage === false,
    [productsInfinite.isSuccess, productsInfinite.hasNextPage],
  );

  const searchRows = useMemo(
    () =>
      isDebouncePending
        ? []
        : searchQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [isDebouncePending, searchQuery.data],
  );

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (isSearching) {
      return searchRows
        .filter((row) => row.type === "product")
        .filter((row) => includeArchived || !row.isArchived)
        .map(directoryEntryFromResolved);
    }
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
  }, [isSearching, searchRows, productsInfinite.data, includeArchived]);

  const projects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (isSearching) {
      return searchRows
        .filter((row) => row.type === "project")
        .filter((row) => includeArchived || !row.isArchived)
        .map(directoryEntryFromResolved);
    }
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
  }, [isSearching, searchRows, projectsInfiniteQuery.data, includeArchived, productNames, hierarchyIsComplete]);

  const quarantinedProjects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (isSearching) return [];
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
  }, [isSearching, projectsInfiniteQuery.data, includeArchived, productNames, hierarchyIsComplete]);

  const hasMoreHierarchy = productsInfinite.hasNextPage ?? false;

  const handleFetchMoreProjects = useCallback(() => {
    void fetchNextProjectPage();
  }, [fetchNextProjectPage]);

  const handleFetchMoreHierarchy = useCallback(() => {
    void fetchNextProductPage();
  }, [fetchNextProductPage]);

  const handleFetchMoreSearchResults = useCallback(() => {
    void fetchNextSearchPage();
  }, [fetchNextSearchPage]);

  function handleRefetch() {
    if (isSearching) {
      void searchQuery.refetch();
      return;
    }
    void productsInfinite.refetch();
    void projectsInfiniteQuery.refetch();
  }

  return {
    products,
    projects,
    quarantinedProjects,
    isLoading:
      canViewState === "loading" ||
      (isSearching
        ? isDebouncePending || searchQuery.isLoading
        : productsInfinite.isLoading || projectsInfiniteQuery.isLoading),
    isRefreshing:
      isSearching
        ? searchQuery.isFetching &&
          !searchQuery.isLoading &&
          !searchQuery.isFetchingNextPage
        : (productsInfinite.isFetching &&
            !productsInfinite.isLoading &&
            !productsInfinite.isFetchingNextPage) ||
          (projectsInfiniteQuery.isFetching &&
            !projectsInfiniteQuery.isLoading &&
            !projectsInfiniteQuery.isFetchingNextPage),
    isError: isSearching
      ? searchQuery.isError
      : productsInfinite.isError || projectsInfiniteQuery.isError,
    isDenied: canViewState === "denied",
    hasMoreProjects: projectsInfiniteQuery.hasNextPage ?? false,
    isFetchingMoreProjects: projectsInfiniteQuery.isFetchingNextPage,
    fetchMoreProjects: handleFetchMoreProjects,
    hasMoreHierarchy,
    isFetchingMoreHierarchy: productsInfinite.isFetchingNextPage,
    fetchMoreHierarchy: handleFetchMoreHierarchy,
    hasMoreSearchResults: searchQuery.hasNextPage ?? false,
    isFetchingMoreSearchResults: searchQuery.isFetchingNextPage,
    fetchMoreSearchResults: handleFetchMoreSearchResults,
    refetch: handleRefetch,
  };
}
