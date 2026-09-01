"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.hr.offerTemplates(),
    queryFn: ({ signal }) => apiClient.get<OfferLetterTemplate[]>("/hr/recruitment/offer-templates", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateOfferTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "offer-templates", "create"],
    mutationFn: (data: { name: string; htmlContent: string; isDefault?: boolean }) =>
      apiClient.post<OfferLetterTemplate>("/hr/recruitment/offer-templates", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.offerTemplates() });
    },
  });
}

export function useUpdateOfferTemplate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "offer-templates", "update", id],
    mutationFn: (data: { name?: string; htmlContent?: string; isDefault?: boolean }) =>
      apiClient.patch<OfferLetterTemplate>(`/hr/recruitment/offer-templates/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.offerTemplates() });
    },
  });
}

export function useDeleteOfferTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "offer-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/offer-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.offerTemplates() });
    },
  });
}

export function useGenerateOfferPdf() {
  return useMutation({
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
        data
      ),
  });
}
