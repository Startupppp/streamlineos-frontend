"use client";

import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { moveLinkedProjectRowCache, patchManagedProductLinkCache } from "./project-managed-product-cache";
import type { ProjectListItem } from "@/types/projects";
import type { LinkedProjectsPage, ProjectLinkedProductRow } from "./managed-product-projects";

const linkedProjectContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  managedProductId: z.number().int().nullable(),
});

interface LinkProjectInput {
  project: ProjectListItem;
  managedProductId: number;
}

export function useLinkProjectManagedProduct() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    z.infer<typeof linkedProjectContract>,
    Error,
    LinkProjectInput
  >("build:managed-products:update", {
    mutationKey: ["projects", "link-managed-product"],
    mutationFn: ({ project, managedProductId }) =>
      apiClient.patch(
        `/build/${project.id}/managed-product`,
        { managedProductId },
        undefined,
        linkedProjectContract,
      ),
    onSuccess: (linked, variables) => {
      patchManagedProductLinkCache(
        queryClient,
        { ...variables.project, name: linked.name, key: linked.key },
        variables.managedProductId,
      );
      moveLinkedProjectRowCache(
        queryClient,
        { ...variables.project, name: linked.name, key: linked.key },
        variables.managedProductId,
      );
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.insights(
          variables.managedProductId,
        ),
        exact: true,
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.linkedProjects(
          variables.managedProductId,
        ),
        exact: false,
        refetchType: "none",
      });
    },
  });
}

interface UnlinkProjectInput {
  projectId: number;
  managedProductId: number;
}

export function useUnlinkProjectManagedProduct() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    z.infer<typeof linkedProjectContract>,
    Error,
    UnlinkProjectInput
  >("build:managed-products:update", {
    mutationKey: ["projects", "unlink-managed-product"],
    mutationFn: ({ projectId }) =>
      apiClient.patch(
        `/build/${projectId}/managed-product`,
        { managedProductId: null },
        undefined,
        linkedProjectContract,
      ),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<{ id: number; managedProductId: number | null } | null>(
        buildWorkQueryKeys.projects.detail(variables.projectId),
        (detail) => (detail ? { ...detail, managedProductId: null } : detail),
      );
      patchManagedProductLinkCache(
        queryClient,
        { id: variables.projectId } as ProjectListItem,
        variables.managedProductId,
      );
      const linkedProjectsKeyPrefix = buildWorkQueryKeys.projects.managedProducts.linkedProjects(
        variables.managedProductId,
      );
      for (const [key, cached] of queryClient.getQueriesData<LinkedProjectsPage>({ queryKey: linkedProjectsKeyPrefix })) {
        if (!cached) continue;
        queryClient.setQueryData<LinkedProjectsPage>(key, {
          ...cached,
          data: cached.data.filter((row) => row.id !== variables.projectId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: linkedProjectsKeyPrefix,
        exact: false,
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.insights(
          variables.managedProductId,
        ),
        exact: true,
        refetchType: "none",
      });
    },
  });
}

const projectLinkResultContract = z.object({
  projectId: z.number().int(),
  managedProductId: z.number().int(),
  isPrimary: z.boolean(),
});
const projectLinkResultC = lazyContract(() =>
  Promise.resolve(projectLinkResultContract),
);
const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export type ProjectLinkResult = z.infer<typeof projectLinkResultContract>;

interface ProjectPairInput {
  managedProductId: number;
  projectId: number;
}

function patchProjectLinkedProductsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number,
  managedProductId: number,
  patch: Partial<ProjectLinkedProductRow> | null,
) {
  const key = buildWorkQueryKeys.projects.managedProducts.projectLinkedProducts(projectId);
  queryClient.setQueryData<{ data: ProjectLinkedProductRow[] }>(key, (cached) => {
    if (!cached) return cached;
    if (patch === null) {
      return { data: cached.data.filter((r) => r.managedProductId !== managedProductId) };
    }
    const exists = cached.data.some((r) => r.managedProductId === managedProductId);
    if (exists) {
      return { data: cached.data.map((r) => r.managedProductId === managedProductId ? { ...r, ...patch } : r) };
    }
    return { data: [...cached.data, { managedProductId, name: "", key: "", status: "active", isPrimary: false, ...patch }] };
  });
}

export function useLinkProjectSecondary() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ProjectLinkResult, Error, ProjectPairInput>(
    "build:managed-products:update",
    {
      mutationKey: ["projects", "link-managed-product-secondary"],
      mutationFn: ({ managedProductId, projectId }) =>
        apiClient.post(
          `/build/managed-products/${managedProductId}/projects/${projectId}`,
          {},
          undefined,
          projectLinkResultC,
        ),
      onSuccess: (result, variables) => {
        patchProjectLinkedProductsCache(queryClient, variables.projectId, variables.managedProductId, { isPrimary: result.isPrimary });
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.linkedProjects(variables.managedProductId),
          exact: false,
          refetchType: "none",
        });
      },
    },
  );
}

export function useSetPrimaryProject() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<ProjectLinkResult, Error, ProjectPairInput>(
    "build:managed-products:update",
    {
      mutationKey: ["projects", "set-primary-project"],
      mutationFn: ({ managedProductId, projectId }) =>
        apiClient.patch(
          `/build/managed-products/${managedProductId}/projects/${projectId}/primary`,
          {},
          undefined,
          projectLinkResultC,
        ),
      onSuccess: (_result, variables) => {
        const key = buildWorkQueryKeys.projects.managedProducts.projectLinkedProducts(variables.projectId);
        queryClient.setQueryData<{ data: ProjectLinkedProductRow[] }>(key, (cached) => {
          if (!cached) return cached;
          return {
            data: cached.data.map((r) => ({
              ...r,
              isPrimary: r.managedProductId === variables.managedProductId,
            })),
          };
        });
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.linkedProjects(variables.managedProductId),
          exact: false,
          refetchType: "none",
        });
      },
    },
  );
}

export function useUnlinkProjectPair() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, ProjectPairInput>(
    "build:managed-products:update",
    {
      mutationKey: ["projects", "unlink-project-pair"],
      mutationFn: ({ managedProductId, projectId }) =>
        apiClient.delete(
          `/build/managed-products/${managedProductId}/projects/${projectId}`,
          undefined,
          undefined,
          noContentC,
        ),
      onSuccess: (_, variables) => {
        patchProjectLinkedProductsCache(queryClient, variables.projectId, variables.managedProductId, null);
        const linkedProjectsKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(variables.managedProductId);
        for (const [key, cached] of queryClient.getQueriesData<LinkedProjectsPage>({ queryKey: linkedProjectsKey })) {
          if (!cached) continue;
          queryClient.setQueryData<LinkedProjectsPage>(key, {
            ...cached,
            data: cached.data.filter((row) => row.id !== variables.projectId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.insights(variables.managedProductId),
          exact: true,
          refetchType: "none",
        });
      },
    },
  );
}
