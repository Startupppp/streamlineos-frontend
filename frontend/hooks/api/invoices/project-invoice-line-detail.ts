"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  InvoiceLineDetail,
  ProjectInvoiceLineDetail,
} from "@/hooks/api/invoices/project-invoice-line-detail-schema";

const projectInvoiceLineDetailC = lazyContract(() =>
  import("@/hooks/api/invoices/project-invoice-line-detail-schema").then(
    (m) => m.projectInvoiceLineDetailContract,
  ),
);
const projectDetailC = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then(
    (m) => m.projectDetailContract,
  ),
);

export interface UpdateProjectInvoiceLineDetailInput {
  projectId: number;
  invoiceLineDetail: InvoiceLineDetail;
}

export function useProjectInvoiceLineDetail(
  projectId: number,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.invoiceLineDetail(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectInvoiceLineDetail>(
        `/build/${projectId}/invoice-line-detail`,
        undefined,
        signal,
        projectInvoiceLineDetailC,
      ),
    staleTime: 60_000,
    enabled:
      canView && Number.isFinite(projectId) && (options?.enabled ?? true),
  });
}

export function useUpdateProjectInvoiceLineDetail() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    ProjectInvoiceLineDetail,
    Error,
    UpdateProjectInvoiceLineDetailInput
  >("build:update", {
    mutationKey: ["build", "projects", "invoice-line-detail", "update"],
    mutationFn: async ({
      projectId,
      invoiceLineDetail,
    }: UpdateProjectInvoiceLineDetailInput) => {
      await apiClient.patch(
        `/build/${projectId}`,
        { invoiceLineDetail },
        undefined,
        projectDetailC,
      );
      return { projectId, invoiceLineDetail };
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.invoiceLineDetail(updated.projectId),
        updated,
      );
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(updated.projectId),
      });
    },
  });
}
