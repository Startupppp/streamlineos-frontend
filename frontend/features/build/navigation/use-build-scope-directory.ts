"use client";

import { useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useProjects } from "@/hooks/api/build/projects";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
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
  isLoading: boolean;
  isError: boolean;
  hasMoreProjects: boolean;
  hasMoreHierarchy: boolean;
  refetch: () => void;
}

const ORGANIZATION_PARENT = "Organization";

export function useBuildScopeDirectory(
  search: string,
  includeArchived: boolean,
): BuildScopeDirectory {
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

  const workspacesQuery = usePmWorkspaces({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });
  const productsQuery = useManagedProducts({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...searchParam,
  });
  const projectsQuery = useProjects({
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

  const workspaces = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = workspacesQuery.data?.data ?? [];
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
  }, [workspacesQuery.data, includeArchived]);

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = productsQuery.data?.data ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
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
  }, [productsQuery.data, includeArchived, workspaceNames]);

  const projects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = projectsQuery.data?.data ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .map((row) => ({
        key: `project:${row.id}`,
        type: "project" as const,
        id: String(row.id),
        name: row.name,
        parentPath:
          (row.managedProductId !== null
            ? productNames.get(row.managedProductId)
            : undefined) ?? ORGANIZATION_PARENT,
        parentKey:
          row.managedProductId !== null
            ? `product:${row.managedProductId}`
            : null,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/${row.id}`,
        isArchived: row.status === "ARCHIVED",
      }));
  }, [projectsQuery.data, includeArchived, productNames]);

  function handleRefetch() {
    void hierarchyWorkspacesQuery.refetch();
    void hierarchyProductsQuery.refetch();
    void workspacesQuery.refetch();
    void productsQuery.refetch();
    void projectsQuery.refetch();
  }

  return {
    workspaces,
    products,
    projects,
    isLoading:
      hierarchyWorkspacesQuery.isLoading ||
      hierarchyProductsQuery.isLoading ||
      workspacesQuery.isLoading ||
      productsQuery.isLoading ||
      projectsQuery.isLoading,
    isError:
      workspacesQuery.isError || productsQuery.isError || projectsQuery.isError,
    hasMoreProjects: projectsQuery.data?.hasMore ?? false,
    hasMoreHierarchy:
      (workspacesQuery.data?.pagination.hasMore ?? false) ||
      (productsQuery.data?.pagination.hasMore ?? false),
    refetch: handleRefetch,
  };
}
