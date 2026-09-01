"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignDocument } from "@/types/sign";

export function useSignDocumentPreview(documentId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.signDocuments.preview(documentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<{ url: string; expiresInSeconds: number }>(`/sign/documents/${documentId}/preview`, undefined, signal),
    enabled: documentId !== undefined,
    staleTime: 60_000,
  });
}

export function useUploadSignDocument(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signDocuments", "upload", envelopeId],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<SignDocument>(`/sign/documents/upload?envelopeId=${envelopeId}`, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.signDocuments.list(envelopeId) });
      qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.detail(envelopeId) });
    },
  });
}

export function useDeleteSignDocument(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signDocuments", "delete", envelopeId],
    mutationFn: (documentId: number) => apiClient.delete<{ success: true }>(`/sign/documents/${documentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.signDocuments.list(envelopeId) });
      qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.detail(envelopeId) });
    },
  });
}
