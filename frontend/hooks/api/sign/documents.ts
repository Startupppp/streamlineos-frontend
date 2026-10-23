"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignDocument, SignEnvelopeFull } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const signDocumentUrlContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signDocumentUrlContract),
);

const signDocumentUploadContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signDocumentUploadContract),
);

const signSuccessContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signSuccessContract),
);

export function useSignDocumentPreview(documentId: number | undefined) {
  return useGatedQuery("sign:documents:view", {
    queryKey: growthAndSignQueryKeys.signDocuments.preview(documentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<{ url: string; expiresInSeconds: number }>(`/sign/documents/${documentId}/preview`, undefined, signal, signDocumentUrlContract),
    enabled: documentId !== undefined,
    staleTime: 60_000,
  });
}

export function useUploadSignDocument(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:documents:upload", {
    mutationKey: ["signDocuments", "upload", envelopeId],
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<SignDocument>(`/sign/documents/upload?envelopeId=${envelopeId}`, formData, signDocumentUploadContract);
    },
    onSuccess: (document) => {
      qc.setQueryData<SignEnvelopeFull>(growthAndSignQueryKeys.signEnvelopes.detail(envelopeId), (current) =>
        current && !current.documents.some((d) => d.id === document.id)
          ? { ...current, documents: [...current.documents, document] }
          : current,
      );
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signDocuments.list(envelopeId) });
    },
  });
}

export function useDeleteSignDocument(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:documents:upload", {
    mutationKey: ["signDocuments", "delete", envelopeId],
    mutationFn: (documentId: number) => apiClient.delete<{ success: true }>(`/sign/documents/${documentId}`, undefined, undefined, signSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signDocuments.list(envelopeId) });
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.detail(envelopeId) });
    },
  });
}
