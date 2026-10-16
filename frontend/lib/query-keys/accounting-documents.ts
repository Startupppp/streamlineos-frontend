import { queryKeyBase as base } from "./base";

const root = [...base, "accountingDocuments"] as const;

/** Files and e-invoicing state hanging off any accounting document, keyed by its ledger kind. */
export const accountingDocumentsQueryKeys = {
  accountingDocuments: {
    all: root,
    attachments: (documentType: string, documentId: string, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "attachments", documentType, documentId] as const)
        : ([...root, "attachments", documentType, documentId, params] as const),
    compliance: (documentType: string, documentId: string) =>
      [...root, "compliance", documentType, documentId] as const,
  },
} as const;
