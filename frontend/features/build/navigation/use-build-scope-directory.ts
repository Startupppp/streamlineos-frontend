"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
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

  const [wsPage2Cursor, setWsPage2Cursor] = useState<string | null>(null);
  const [productPage2Cursor, setProductPage2Cursor] = useState<string | null>(null);
  const filterKey = `${debouncedSearch}|${String(includeArchived)}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);

  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setWsPage2Cursor(null);
    setProductPage2Cursor(null);
  }

  const hierarchyWorkspacesQuery = usePmWorkspaces({
    limit: BUILD_SCOPE_PAGE_LIMIT,
  });
  const hierarchyProductsQuery = useManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
  });

  const workspacesP1 = usePmWorkspaces({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });
  const productsP1 = useManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });

  const workspacesP2 = usePmWorkspaces(
    wsPage2Cursor
      ? { limit: BUILD_SCOPE_PAGE_LIMIT, cursor: wsPage2Cursor, ...searchParam }
      : { limit: BUILD_SCOPE_PAGE_LIMIT, ...searchParam },
  );
  const productsP2 = useManagedProducts(
    productPage2Cursor
      ? { limit: BUILD_SCOPE_PAGE_LIMIT, cursor: productPage2Cursor, ...searchParam }
      : { limit: BUILD_SCOPE_PAGE_LIMIT, ...searchParam },
  );

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
    const p1 = workspacesP1.data?.data ?? [];
    const p2 = wsPage2Cursor ? (workspacesP2.data?.data ?? []) : [];
    const rows = [...p1, ...p2];
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
  }, [workspacesP1.data, wsPage2Cursor, workspacesP2.data, includeArchived]);

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const p1 = productsP1.data?.data ?? [];
    const p2 = productPage2Cursor ? (productsP2.data?.data ?? []) : [];
    const rows = [...p1, ...p2];
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
  }, [productsP1.data, productPage2Cursor, productsP2.data, includeArchived, workspaceNames, hierarchyIsComplete]);

  const quarantinedProducts = useMemo<BuildScopeDirectoryEntry[]>(() => {
    if (!hierarchyIsComplete) return [];
    const p1 = productsP1.data?.data ?? [];
    const p2 = productPage2Cursor ? (productsP2.data?.data ?? []) : [];
    const rows = [...p1, ...p2];
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
  }, [productsP1.data, productPage2Cursor, productsP2.data, includeArchived, workspaceNames, hierarchyIsComplete]);

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
    (!wsPage2Cursor && (workspacesP1.data?.pagination.hasMore ?? false)) ||
    (!productPage2Cursor && (productsP1.data?.pagination.hasMore ?? false));

  const handleFetchMoreProjects = useCallback(() => {
    void projectsInfiniteQuery.fetchNextPage();
  }, [projectsInfiniteQuery.fetchNextPage]);

  const handleFetchMoreHierarchy = useCallback(() => {
    if (!wsPage2Cursor) {
      const next = workspacesP1.data?.pagination.nextCursor;
      if (next) setWsPage2Cursor(next);
    }
    if (!productPage2Cursor) {
      const next = productsP1.data?.pagination.nextCursor;
      if (next) setProductPage2Cursor(next);
    }
  }, [wsPage2Cursor, productPage2Cursor, workspacesP1.data, productsP1.data]);

  function handleRefetch() {
    void hierarchyWorkspacesQuery.refetch();
    void hierarchyProductsQuery.refetch();
    void workspacesP1.refetch();
    void productsP1.refetch();
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
      workspacesP1.isLoading ||
      productsP1.isLoading ||
      projectsInfiniteQuery.isLoading,
    isRefreshing:
      (workspacesP1.isFetching && !workspacesP1.isLoading) ||
      (productsP1.isFetching && !productsP1.isLoading) ||
      (projectsInfiniteQuery.isFetching &&
        !projectsInfiniteQuery.isLoading &&
        !projectsInfiniteQuery.isFetchingNextPage),
    isError:
      workspacesP1.isError || productsP1.isError || projectsInfiniteQuery.isError,
    isDenied: canViewState === "denied",
    hasMoreProjects: projectsInfiniteQuery.hasNextPage ?? false,
    isFetchingMoreProjects: projectsInfiniteQuery.isFetchingNextPage,
    fetchMoreProjects: handleFetchMoreProjects,
    hasMoreHierarchy,
    isFetchingMoreHierarchy:
      (wsPage2Cursor !== null && workspacesP2.isFetching) ||
      (productPage2Cursor !== null && productsP2.isFetching),
    fetchMoreHierarchy: handleFetchMoreHierarchy,
    refetch: handleRefetch,
  };
}
