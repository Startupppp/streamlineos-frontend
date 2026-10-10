"use client";

import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { patchManagedProductLinkCache } from "./project-managed-product-cache";
import type { ProjectListItem } from "@/types/projects";
import type { LinkedProjectsPage } from "./managed-product-projects";

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
