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
  managedProductId: number | null;
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
    onSuccess: (project) => {
      void queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(project.id),
      });
      if (project.managedProductId !== null) {
        void queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.detail(project.managedProductId),
        });
        void queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.managedProducts.insights(project.managedProductId),
        });
      }
    },
  });
}
