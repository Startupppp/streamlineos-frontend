"use client";

import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const linkedProjectContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  managedProductId: z.number().int().nullable(),
});

interface LinkProjectInput {
  projectId: number;
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
    mutationFn: ({ projectId, managedProductId }) =>
      apiClient.patch(
        `/build/${projectId}/managed-product`,
        { managedProductId },
        undefined,
        linkedProjectContract,
      ),
    onSuccess: async (project, variables) => {
      const refreshes = [
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.list(),
        }),
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.detail(project.id),
        }),
      ];
      refreshes.push(
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.detail(variables.managedProductId),
        }),
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.insights(variables.managedProductId),
        }),
      );
      await Promise.all(refreshes);
    },
  });
}
