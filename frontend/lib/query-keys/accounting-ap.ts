import { queryKeyBase as base } from "./base";

const root = [...base, "accountingAp"] as const;

export const accountingApQueryKeys = {
  accountingAp: {
    all: root,
    vendorsAll: [...root, "vendors"] as const,
    vendors: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "vendors"] as const) : ([...root, "vendors", params] as const),
    vendor: (partyId: string) => [...root, "vendor", partyId] as const,
    documentsAll: [...root, "documents"] as const,
    documents: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "documents"] as const)
        : ([...root, "documents", params] as const),
    document: (apDocumentId: string) => [...root, "document", apDocumentId] as const,
    documentTaxPreview: (apDocumentId: string) =>
      [...root, "document", apDocumentId, "taxPreview"] as const,
    paymentsAll: [...root, "payments"] as const,
    payments: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "payments"] as const)
        : ([...root, "payments", params] as const),
    payment: (paymentId: string) => [...root, "payment", paymentId] as const,
    agingAll: [...root, "aging"] as const,
    aging: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "aging"] as const) : ([...root, "aging", params] as const),
    agingTieOut: (asOf: string) => [...root, "aging", "tieOut", asOf] as const,
  },
} as const;
