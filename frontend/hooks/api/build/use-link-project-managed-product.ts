"use client";

import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { patchManagedProductLinkCache } from "./project-managed-product-cache";
import type { ProjectListItem } from "@/types/projects";

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
      // Product insights contain derived work counts that a sparse link result cannot reconstruct.
      void queryClient.refetchQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.insights(
          variables.managedProductId,
        ),
        type: "active",
      });
    },
  });
}
