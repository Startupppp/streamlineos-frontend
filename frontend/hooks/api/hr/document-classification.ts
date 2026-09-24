"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type { DocumentClassification } from "@/types/hr";

const classificationLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-classification-schema").then((m) => m.documentClassificationContract),
);
const classifyLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-classification-schema").then((m) => m.classifyDocumentContract),
);
const audiencesLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-classification-schema").then((m) => m.setDocumentAudiencesContract),
);

export type DocumentAudienceKind = "ALL_EMPLOYEES" | "DEPARTMENT" | "LOCATION";

export interface DocumentAudienceEntry {
  kind: DocumentAudienceKind;
  refId: string | null;
}

export interface DocumentAudience extends DocumentAudienceEntry {
  id: number;
  label: string | null;
}

export type PublishBlockerCode =
  | "CLASSIFICATION_NOT_SHAREABLE"
  | "BELONGS_TO_AN_EMPLOYEE"
  | "TYPE_NOT_ALLOWED"
  | "DOCUMENT_INACTIVE"
  | "HIRING_ARTEFACT";

export interface DocumentClassificationView {
  documentId: number;
  classification: DocumentClassification;
  effectiveDate: string | null;
  audiences: DocumentAudience[];
  publishable: boolean;
  blockers: Array<{ code: PublishBlockerCode; message: string }>;
}

export interface ClassifyDocumentResult extends DocumentClassificationView {
  linksTakenDown: number;
}

export interface SetDocumentAudiencesResult extends DocumentClassificationView {
  linkAudiencesNarrowed: number;
}

export interface ClassifyDocumentInput {
  documentId: number;
  classification: DocumentClassification;
  effectiveDate?: string | null;
}

export interface SetDocumentAudiencesInput {
  documentId: number;
  audiences: DocumentAudienceEntry[];
}

/** Org-wide view authority: `GET …/classification` refuses a caller whose document scope is below `all`, so this does not fire for one. */
export function useDocumentClassification(documentId: number | null, options?: { enabled?: boolean }) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.documentClassification(documentId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<DocumentClassificationView>(
        `/hr/documents/${documentId}/classification`,
        undefined,
        signal,
        classificationLazy,
      ),
    staleTime: 15_000,
    enabled: documentId !== null && hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useClassifyDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documents", "classify"],
    mutationFn: ({ documentId, ...body }: ClassifyDocumentInput) =>
      apiClient.patch<ClassifyDocumentResult>(
        `/hr/documents/${documentId}/classification`,
        body,
        undefined,
        classifyLazy,
      ),
    onSuccess: (result) => {
      qc.setQueryData(humanResourcesQueryKeys.hr.documentClassification(result.documentId), result);
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
    },
  });
}

export function useSetDocumentAudiences() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "audiences"],
    mutationFn: ({ documentId, audiences }: SetDocumentAudiencesInput) =>
      apiClient.put<SetDocumentAudiencesResult>(
        `/hr/documents/${documentId}/audiences`,
        { audiences },
        undefined,
        audiencesLazy,
      ),
    onSuccess: (result) => {
      qc.setQueryData(humanResourcesQueryKeys.hr.documentClassification(result.documentId), result);
    },
  });
}
