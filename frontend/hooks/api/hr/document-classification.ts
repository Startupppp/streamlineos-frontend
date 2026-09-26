"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan, useModuleEnabled, useScope } from "@/hooks/api/access";
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

/**
 * The classification, version and Knowledge Base link reads are organisation-wide authority: each one answers 403
 * ("Organization-wide document access is required") to a caller whose scope on `hr:documents:view` is below `all`.
 * `useCan` is scope-blind, so it is true for a manager who holds the key at team scope, and a read gated on it alone
 * sends a request the server is certain to refuse. `useScope` is `none` until access has loaded, so these wait for it.
 */
export function useCanReadDocumentSharing(): boolean {
  return useScope("hr:documents:view") === "all";
}

/**
 * Whether "Classification and sharing" can be used at all. The sheet reads the document's classification (view at
 * `all`) and saves it through a PATCH the server scopes the same way on `hr:documents:manage`; a caller short of
 * either would open a sheet whose every request is refused. Fails closed until access has loaded.
 */
export function useCanClassifyDocuments(): boolean {
  const canManage = useCan("hr:documents:manage");
  const manageScope = useScope("hr:documents:manage");
  const canRead = useCanReadDocumentSharing();
  return canManage && manageScope === "all" && canRead;
}

/**
 * What the Knowledge Base shows of a document lives under two key trees: the document's own link state (HR side) and
 * the lists of entries every reader sees (Knowledge Base side). Call this after the write that could move either.
 */
function refreshKnowledgeBaseView(qc: QueryClient, documentId: number): void {
  void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentKbLink(documentId) });
  void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments() });
}

export function useDocumentClassification(documentId: number | null, options?: { enabled?: boolean }) {
  const canView = useCan("hr:documents:view");
  const orgWide = useCanReadDocumentSharing();
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
    enabled: documentId !== null && hrEnabled && canView && orgWide && (options?.enabled ?? true),
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
      // `documentsAll` is the prefix of this document's classification, link state and versions as well as of the HR list, so this one call refreshes all four.
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
      // Reclassifying can take the entry down (`linksTakenDown`), and the Knowledge Base lists are a different key tree.
      void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments() });
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
    onSuccess: async (result) => {
      const classificationKey = humanResourcesQueryKeys.hr.documentClassification(result.documentId);
      // The classify call before this one refetched the document while this PUT was still in flight; that read answers with the old audience and would land after the write below.
      await qc.cancelQueries({ queryKey: classificationKey });
      qc.setQueryData(classificationKey, result);
      // Read after the PUT, not before it, and covering entries whose own audience was narrowed to fit (`linkAudiencesNarrowed`).
      refreshKnowledgeBaseView(qc, result.documentId);
    },
  });
}
