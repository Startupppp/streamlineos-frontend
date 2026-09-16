"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const offerTemplatesListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offer-templates-schema").then((m) => m.offerTemplatesListContract),
);
const createOfferTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offer-templates-schema").then((m) => m.createOfferTemplateContract),
);
const updateOfferTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offer-templates-schema").then((m) => m.updateOfferTemplateContract),
);
const deleteOfferTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offer-templates-schema").then((m) => m.deleteOfferTemplateContract),
);
const generateOfferPdfC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/offer-templates-schema").then((m) => m.generateOfferPdfContract),
);

export interface OfferLetterTemplate {
  id: number;
  orgId: string;
  name: string;
  htmlContent: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null };
}

export function useOfferTemplates() {
  return useGatedQuery("hr:offers:view", {
    queryKey: humanResourcesQueryKeys.hr.offerTemplates(),
    queryFn: ({ signal }) => apiClient.get<OfferLetterTemplate[]>("/hr/recruitment/offer-templates", undefined, signal, offerTemplatesListC),
    staleTime: 5 * 60_000,
  });
}

export function useCreateOfferTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offer-templates", "create"],
    mutationFn: (data: { name: string; htmlContent: string; isDefault?: boolean }) =>
      apiClient.post<OfferLetterTemplate>("/hr/recruitment/offer-templates", data, undefined, createOfferTemplateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.offerTemplates() });
    },
  });
}

export function useUpdateOfferTemplate(offerTemplateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offer-templates", "update", offerTemplateId],
    mutationFn: (data: { name?: string; htmlContent?: string; isDefault?: boolean }) =>
      apiClient.patch<OfferLetterTemplate>(`/hr/recruitment/offer-templates/${offerTemplateId}`, data, undefined, updateOfferTemplateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.offerTemplates() });
    },
  });
}

export function useDeleteOfferTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offer-templates", "delete"],
    mutationFn: (offerTemplateId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/offer-templates/${offerTemplateId}`, undefined, undefined, deleteOfferTemplateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.offerTemplates() });
    },
  });
}

export function useGenerateOfferPdf() {
  return useAuthorizedMutation("hr:offers:manage", {
    mutationKey: ["hr", "recruitment", "offer-templates", "generate-pdf"],
    mutationFn: ({
      templateId,
      ...data
    }: {
      templateId: number;
      candidateName?: string;
      designation?: string;
      salary?: string;
      joiningDate?: string;
      validUntil?: string;
      orgName?: string;
    }) =>
      apiClient.post<{ base64: string; mimeType: string; fileName: string }>(
        `/hr/recruitment/offer-templates/${templateId}/generate-pdf`,
        data,
        undefined,
        generateOfferPdfC,
      ),
  });
}
