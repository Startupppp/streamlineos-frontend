"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import {
  useCanReadDocumentSharing,
  type DocumentAudience,
  type DocumentAudienceEntry,
} from "@/hooks/api/hr/document-classification";
import type { PublishBlocker } from "@/hooks/api/hr/document-kb-link-schema";

const linkLazy = lazyContract(() => import("@/hooks/api/hr/document-kb-link-schema").then((m) => m.documentKbLinkStateContract));
const versionsLazy = lazyContract(() => import("@/hooks/api/hr/document-kb-link-schema").then((m) => m.documentVersionsContract));

export interface DocumentKbLinkState {
  documentId: number;
  link: {
    id: number;
    status: "active" | "unpublished" | "source_removed";
    versionMode: "FOLLOW_LATEST" | "PINNED";
    pinnedVersion: number | null;
    audiences: Array<Omit<DocumentAudience, "id">>;
    publishedAt: string;
    unpublishedAt: string | null;
    unpublishReason: string | null;
    newerVersionAvailable: boolean;
  } | null;
  publishable: boolean;
  blockers: Array<PublishBlocker>;
  documentAudiences: Array<Omit<DocumentAudience, "id">>;
}

export interface DocumentVersionRow {
  version: number;
  status: "pending" | "approved" | "rejected";
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  effectiveDate: string | null;
  approvedAt: string | null;
  isCurrent: boolean;
}

export interface DocumentVersionsView {
  documentId: number;
  currentVersion: number;
  versions: DocumentVersionRow[];
}

/** Organisation-wide: the route answers 403 to a caller whose `hr:documents:view` scope is below `all`, so it is not asked for one (see `useCanReadDocumentSharing`). */
export function useDocumentKbLink(documentId: number | null, options?: { enabled?: boolean }) {
  const canView = useCan("hr:documents:view");
  const orgWide = useCanReadDocumentSharing();
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.documentKbLink(documentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<DocumentKbLinkState>(`/hr/documents/${documentId}/kb-link`, undefined, signal, linkLazy),
    staleTime: 15_000,
    enabled: documentId !== null && hrEnabled && canView && orgWide && (options?.enabled ?? true),
  });
}

/** Everything a change to an entry can touch: the entry itself, the KB lists that show it, and the document's own view. */
function useRefreshAfterLinkChange() {
  const qc = useQueryClient();
  return (state: DocumentKbLinkState) => {
    qc.setQueryData(humanResourcesQueryKeys.hr.documentKbLink(state.documentId), state);
    void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments() });
    void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentClassification(state.documentId) });
  };
}

export interface PublishDocumentInput {
  documentId: number;
  /** Omitted: the entry is for the same people the document is for. */
  audiences?: DocumentAudienceEntry[];
}

export function usePublishDocumentToKb() {
  const refresh = useRefreshAfterLinkChange();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "kbPublish"],
    mutationFn: ({ documentId, audiences }: PublishDocumentInput) =>
      apiClient.post<DocumentKbLinkState>(`/hr/documents/${documentId}/kb-link`, audiences ? { audiences } : {}, undefined, linkLazy),
    onSuccess: refresh,
  });
}

export interface WithdrawDocumentInput {
  documentId: number;
  /** Why it is being taken out, in the publisher's words. It goes on the entry and into the audit log. */
  reason: string;
}

export function useWithdrawDocumentFromKb() {
  const refresh = useRefreshAfterLinkChange();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "kbWithdraw"],
    mutationFn: ({ documentId, reason }: WithdrawDocumentInput) =>
      apiClient.delete<DocumentKbLinkState>(`/hr/documents/${documentId}/kb-link`, { reason }, undefined, linkLazy),
    onSuccess: refresh,
  });
}

/** Organisation-wide, like the link state: not asked for a caller whose `hr:documents:view` scope is below `all`. */
export function useDocumentVersions(documentId: number | null, options?: { enabled?: boolean }) {
  const canView = useCan("hr:documents:view");
  const orgWide = useCanReadDocumentSharing();
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.documentVersions(documentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<DocumentVersionsView>(`/hr/documents/${documentId}/versions`, undefined, signal, versionsLazy),
    staleTime: 15_000,
    enabled: documentId !== null && hrEnabled && canView && orgWide && (options?.enabled ?? true),
  });
}

export interface UploadDocumentVersionInput {
  documentId: number;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  effectiveDate?: string;
}

export function useUploadDocumentVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documents", "versionUpload"],
    mutationFn: ({ documentId, ...body }: UploadDocumentVersionInput) =>
      apiClient.post<DocumentVersionsView>(`/hr/documents/${documentId}/versions`, body, undefined, versionsLazy),
    onSuccess: (view) => qc.setQueryData(humanResourcesQueryKeys.hr.documentVersions(view.documentId), view),
  });
}

export interface RetargetDocumentInput {
  documentId: number;
  audiences?: DocumentAudienceEntry[];
  versionMode?: "FOLLOW_LATEST" | "PINNED";
  pinnedVersion?: number;
}

export function useRetargetDocumentKbLink() {
  const refresh = useRefreshAfterLinkChange();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "kbRetarget"],
    mutationFn: ({ documentId, ...body }: RetargetDocumentInput) =>
      apiClient.patch<DocumentKbLinkState>(`/hr/documents/${documentId}/kb-link`, body, undefined, linkLazy),
    onSuccess: refresh,
  });
}

export function useApproveDocumentVersion() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "versionApprove"],
    mutationFn: ({ documentId, version }: { documentId: number; version: number }) =>
      apiClient.post<DocumentVersionsView>(`/hr/documents/${documentId}/versions/${version}/approve`, undefined, undefined, versionsLazy),
    onSuccess: (view) => {
      qc.setQueryData(humanResourcesQueryKeys.hr.documentVersions(view.documentId), view);
      // The file everyone reads just changed: the HR list, the entry and its readers all have a new version.
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentKbLink(view.documentId) });
      void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments() });
    },
  });
}
