"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const acknowledgementListLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-acknowledgements-schema").then(
    (m) => m.documentAcknowledgementContract,
  ),
);
const acknowledgeLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-acknowledgements-schema").then(
    (m) => m.acknowledgeDocumentContract,
  ),
);

export type DocumentAcknowledgementStatus = "PENDING" | "ACKNOWLEDGED";

export interface DocumentAcknowledgement {
  id: number;
  documentId: number;
  userId: string;
  status: DocumentAcknowledgementStatus;
  acknowledgedAt: string | null;
  createdAt: string;
  document: {
    id: number;
    name: string;
    description?: string | null;
    hasFile?: boolean;
    fileName?: string | null;
  } | null;
  user?: { id: string; name: string | null } | null;
}

export const documentAcknowledgementsKey =
  humanResourcesQueryKeys.hr.documentAcknowledgements();

export function useDocumentAcknowledgements(options?: { enabled?: boolean }) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: documentAcknowledgementsKey,
    queryFn: ({ signal }) =>
      apiClient.get<DocumentAcknowledgement[]>(
        "/hr/compliance",
        undefined,
        signal,
        acknowledgementListLazy,
      ),
    staleTime: 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useAcknowledgeDocument() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("hr:documents:view", {
    mutationKey: ["hr", "compliance", "acknowledge"],
    mutationFn: (acknowledgmentId: number) =>
      apiClient.patch<{ success: true }>(
        "/hr/compliance",
        { acknowledgmentId, status: "ACKNOWLEDGED" },
        undefined,
        acknowledgeLazy,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentAcknowledgementsKey });
      void queryClient.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.onboardingDocsAll,
      });
    },
  });
}
