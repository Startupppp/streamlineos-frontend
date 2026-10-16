"use client";

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { downloadExport } from "@/lib/download-export";
import { readFileAsBase64 } from "@/lib/read-file-as-base64";
import { accountingDocumentsQueryKeys } from "@/lib/query-keys/accounting-documents";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  AttachableDocumentType,
  DocumentAttachment,
  DocumentAttachmentPage,
  DocumentCompliance,
  RemovedAttachment,
  SubmitDocumentComplianceResult,
} from "@/hooks/api/accounting/documents-schema";

/**
 * Document-level actions shared by the invoice, credit-note and bill detail
 * pages: the printable PDF, attached files, and the e-invoicing state.
 */

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const STANDARD_LIST_STALE = 30 * 1000;
const ENTITY_STALE = 60 * 1000;

export const ATTACHMENTS_READ = "accounting:attachments:read";
export const ATTACHMENTS_MANAGE = "accounting:attachments:manage";

/** Mirrors `ALLOWED_ATTACHMENT_MIME_TYPES` and `MAX_ATTACHMENT_BYTES` in the backend DTO. */
export const ATTACHMENT_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

const attachmentPageContract = lazyContract(() =>
  import("@/hooks/api/accounting/documents-schema").then((m) => m.documentAttachmentPageContract),
);
const attachmentContract = lazyContract(() =>
  import("@/hooks/api/accounting/documents-schema").then((m) => m.documentAttachmentContract),
);
const removedAttachmentContract = lazyContract(() =>
  import("@/hooks/api/accounting/documents-schema").then((m) => m.removedAttachmentContract),
);
const complianceContract = lazyContract(() =>
  import("@/hooks/api/accounting/documents-schema").then((m) => m.documentComplianceContract),
);
const submitComplianceContract = lazyContract(() =>
  import("@/hooks/api/accounting/documents-schema").then(
    (m) => m.submitDocumentComplianceContract,
  ),
);

export type DocumentPdfKind = "invoice" | "credit-note" | "bill";

const PDF_PATHS: Readonly<Record<DocumentPdfKind, string>> = {
  invoice: "/accounting/ar/invoices",
  "credit-note": "/accounting/ar/credit-notes",
  bill: "/accounting/payables/documents",
};

/** Saves the posted document's PDF; a draft 409s with "post it first". */
export function useDownloadDocumentPdf(kind: DocumentPdfKind) {
  const permission =
    kind === "bill"
      ? "accounting:payables:read"
      : kind === "credit-note"
        ? "accounting:credit-notes:read"
        : "accounting:receivables:read";
  return useAuthorizedMutation<
    { filename: string; bytes: number },
    Error,
    { documentId: string; fallbackName: string }
  >(permission, {
    mutationKey: ["accounting", "documents", kind, "pdf"],
    mutationFn: ({ documentId, fallbackName }) =>
      downloadExport(`${PDF_PATHS[kind]}/${documentId}/pdf`, {
        label: `${kind.replace("-", " ")} PDF`,
        fallbackName,
      }),
  });
}

export function useDocumentAttachments(
  documentType: AttachableDocumentType,
  documentId: string,
  query: { page: number; pageSize: number },
  options?: QueryOpts<DocumentAttachmentPage>,
) {
  const canRead = useCan(ATTACHMENTS_READ);
  const params = { page: query.page, pageSize: query.pageSize };
  return useQuery<DocumentAttachmentPage, Error>({
    queryKey: accountingDocumentsQueryKeys.accountingDocuments.attachments(
      documentType,
      documentId,
      params,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<DocumentAttachmentPage>(
        `/accounting/documents/${documentType}/${documentId}/attachments`,
        params,
        signal,
        attachmentPageContract,
      ),
    staleTime: STANDARD_LIST_STALE,
    ...options,
    enabled: canRead && !!documentId && (options?.enabled ?? true),
  });
}

export function useAttachDocumentFile(documentType: AttachableDocumentType, documentId: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<DocumentAttachment, Error, File>("accounting:attachments:manage", {
    mutationKey: ["accounting", "documents", "attachments", "attach"],
    mutationFn: async (file) =>
      apiClient.post<DocumentAttachment>(
        `/accounting/documents/${documentType}/${documentId}/attachments`,
        {
          fileName: file.name,
          mimeType: file.type,
          contentBase64: await readFileAsBase64(file),
        },
        undefined,
        attachmentContract,
      ),
    onSuccess: (created) => {
      // Newest first, so the new file belongs at the head of page 1.
      queryClient.setQueriesData<DocumentAttachmentPage>(
        {
          queryKey: accountingDocumentsQueryKeys.accountingDocuments.attachments(
            documentType,
            documentId,
          ),
        },
        (page) =>
          page && {
            ...page,
            items:
              page.page === 1 ? [created, ...page.items].slice(0, page.pageSize) : page.items,
            total: page.total + 1,
          },
      );
    },
  });
}

export function useRemoveDocumentAttachment(
  documentType: AttachableDocumentType,
  documentId: string,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<RemovedAttachment, Error, string>("accounting:attachments:manage", {
    mutationKey: ["accounting", "documents", "attachments", "remove"],
    mutationFn: (attachmentId) =>
      apiClient.delete<RemovedAttachment>(
        `/accounting/documents/attachments/${attachmentId}`,
        undefined,
        undefined,
        removedAttachmentContract,
      ),
    onSuccess: (removed) => {
      queryClient.setQueriesData<DocumentAttachmentPage>(
        {
          queryKey: accountingDocumentsQueryKeys.accountingDocuments.attachments(
            documentType,
            documentId,
          ),
        },
        (page) =>
          page && {
            ...page,
            items: page.items.filter((item) => item.id !== removed.id),
            total: Math.max(0, page.total - 1),
          },
      );
    },
  });
}

/** Streams the stored bytes back through the permission gate and saves them. */
export function useDownloadDocumentAttachment() {
  return useAuthorizedMutation<{ filename: string; bytes: number }, Error, DocumentAttachment>(
    "accounting:attachments:read",
    {
      mutationKey: ["accounting", "documents", "attachments", "download"],
      mutationFn: (attachment) =>
        downloadExport(`/accounting/documents/attachments/${attachment.id}/content`, {
          label: "attachment",
          fallbackName: attachment.fileName,
        }),
    },
  );
}

/**
 * The document's e-reporting state. A 404 means no decision was recorded
 * (a draft, or a document posted before compliance existed) and reads as null.
 */
export function useDocumentCompliance(
  documentType: "sales_invoice" | "credit_note",
  documentId: string,
  options?: QueryOpts<DocumentCompliance | null>,
) {
  const canRead = useCan("accounting:receivables:read");
  return useQuery<DocumentCompliance | null, Error>({
    queryKey: accountingDocumentsQueryKeys.accountingDocuments.compliance(
      documentType,
      documentId,
    ),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<DocumentCompliance>(
          `/accounting/compliance/documents/${documentType}/${documentId}`,
          undefined,
          signal,
          complianceContract,
        );
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!documentId && (options?.enabled ?? true),
  });
}

export function useSubmitDocumentCompliance(
  documentType: "sales_invoice" | "credit_note",
  documentId: string,
) {
  const queryClient = useQueryClient();
  return useAuthorizedIdempotentMutation<SubmitDocumentComplianceResult, Error, void>(
    "accounting:receivables:manage",
    {
      mutationKey: ["accounting", "compliance", "submit"],
      mutationFn: (_input, idempotencyKey) =>
        apiClient.post<SubmitDocumentComplianceResult>(
          `/accounting/compliance/documents/${documentType}/${documentId}/submit`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
          submitComplianceContract,
        ),
      onSuccess: () => {
        // The response carries only the row this adapter wrote; the full state list is the server's.
        void queryClient.invalidateQueries({
          queryKey: accountingDocumentsQueryKeys.accountingDocuments.compliance(
            documentType,
            documentId,
          ),
          exact: true,
        });
      },
    },
  );
}
