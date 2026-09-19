"use client";

import { useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useProjects } from "@/hooks/api/build/projects";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
import type { BuildScopeRef } from "./use-build-nav-preferences";

export const BUILD_SCOPE_SEARCH_DEBOUNCE_MS = 300;
export const BUILD_SCOPE_PAGE_LIMIT = 50;

export const ORGANIZATION_SCOPE_REF: BuildScopeRef = {
  key: "organization",
  type: "organization",
  id: "organization",
  name: "All of Build",
  parentPath: null,
  projectKey: null,
  href: `${BUILD_ROOT_PATH}/command-center`,
};

export interface BuildScopeDirectoryEntry extends BuildScopeRef {
  isArchived: boolean;
  parentKey: string | null;
}

export interface BuildScopeDirectory {
  workspaces: BuildScopeDirectoryEntry[];
  products: BuildScopeDirectoryEntry[];
  projects: BuildScopeDirectoryEntry[];
  isLoading: boolean;
  isError: boolean;
  hasMoreProjects: boolean;
  refetch: () => void;
}

const ORGANIZATION_PARENT = "Organization";

function matches(query: string, ...values: (string | null)[]): boolean {
  if (query.length === 0) return true;
  return values.some(
    (value) => value !== null && value.toLowerCase().includes(query),
  );
}

export function useBuildScopeDirectory(
  search: string,
  includeArchived: boolean,
): BuildScopeDirectory {
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    BUILD_SCOPE_SEARCH_DEBOUNCE_MS,
  );
  const query = debouncedSearch.toLowerCase();

  const workspacesQuery = usePmWorkspaces({ limit: BUILD_SCOPE_PAGE_LIMIT });
  const productsQuery = useManagedProducts({ limit: BUILD_SCOPE_PAGE_LIMIT });
  const projectsQuery = useProjects({
    limit: BUILD_SCOPE_PAGE_LIMIT,
    ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {}),
    ...(includeArchived ? { status: "ALL" as const } : {}),
  });

  const workspaces = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = workspacesQuery.data?.data ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
      .filter((row) => matches(query, row.name, row.slug))
      .map((row) => ({
        key: `workspace:${row.pmWorkspaceId}`,
        type: "workspace" as const,
        id: row.pmWorkspaceId,
        name: row.name,
        parentPath: ORGANIZATION_PARENT,
        projectKey: null,
        href: `${BUILD_ROOT_PATH}/workspaces/${row.pmWorkspaceId}`,
        isArchived: row.status === "archived",
        parentKey: null,
      }));
  }, [workspacesQuery.data, includeArchived, query]);

  const workspaceNames = useMemo(() => {
    const rows = workspacesQuery.data?.data ?? [];
    return new Map(rows.map((row) => [row.pmWorkspaceId, row.name]));
  }, [workspacesQuery.data]);

  const products = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = productsQuery.data?.data ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "archived")
      .filter((row) => matches(query, row.name, row.key))
      .map((row) => ({
        key: `product:${row.id}`,
        type: "product" as const,
        id: String(row.id),
        name: row.name,
        parentPath:
          (row.pmWorkspaceId !== null
            ? workspaceNames.get(row.pmWorkspaceId)
            : undefined) ?? ORGANIZATION_PARENT,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/managed-products/${row.id}`,
        isArchived: row.status === "archived",
        parentKey:
          row.pmWorkspaceId !== null ? `workspace:${row.pmWorkspaceId}` : null,
      }));
  }, [productsQuery.data, includeArchived, query, workspaceNames]);

  const productNames = useMemo(() => {
    const rows = productsQuery.data?.data ?? [];
    return new Map(rows.map((row) => [row.id, row.name]));
  }, [productsQuery.data]);

  const projects = useMemo<BuildScopeDirectoryEntry[]>(() => {
    const rows = projectsQuery.data?.data ?? [];
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .filter((row) => matches(query, row.name, row.key))
      .map((row) => ({
        key: `project:${row.id}`,
        type: "project" as const,
        id: String(row.id),
        name: row.name,
        parentPath:
          (row.managedProductId !== null
            ? productNames.get(row.managedProductId)
            : undefined) ?? ORGANIZATION_PARENT,
        projectKey: row.key,
        href: `${BUILD_ROOT_PATH}/${row.id}`,
        isArchived: row.status === "ARCHIVED",
        parentKey:
          row.managedProductId !== null
            ? `product:${row.managedProductId}`
            : null,
      }));
  }, [projectsQuery.data, includeArchived, query, productNames]);

  function handleRefetch() {
    void workspacesQuery.refetch();
    void productsQuery.refetch();
    void projectsQuery.refetch();
  }

  return {
    workspaces,
    products,
    projects,
    isLoading:
      workspacesQuery.isLoading ||
      productsQuery.isLoading ||
      projectsQuery.isLoading,
    isError:
      workspacesQuery.isError || productsQuery.isError || projectsQuery.isError,
    hasMoreProjects: projectsQuery.data?.hasMore ?? false,
    refetch: handleRefetch,
  };
}
