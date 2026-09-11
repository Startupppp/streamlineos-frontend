import { queryKeyBase as base } from "./base";

const root = [...base, "accountingAr"] as const;

export const accountingArQueryKeys = {
  accountingAr: {
    all: root,
    parties: (params?: Record<string, unknown>) => [...root, "parties", params] as const,
    party: (partyId: string) => [...root, "party", partyId] as const,
    partyTaxRegistrations: (partyId: string) =>
      [...root, "party", partyId, "taxRegistrations"] as const,
    invoices: (params?: Record<string, unknown>) => [...root, "invoices", params] as const,
    invoice: (invoiceId: string) => [...root, "invoice", invoiceId] as const,
    invoiceTaxPreview: (invoiceId: string, revision?: string) =>
      [...root, "invoice", invoiceId, "taxPreview", revision] as const,
    invoiceTaxLines: (invoiceId: string) => [...root, "invoice", invoiceId, "taxLines"] as const,
    creditNotes: (params?: Record<string, unknown>) => [...root, "creditNotes", params] as const,
    creditNote: (creditNoteId: string) => [...root, "creditNote", creditNoteId] as const,
    creditNoteTaxPreview: (creditNoteId: string, revision?: string) =>
      [...root, "creditNote", creditNoteId, "taxPreview", revision] as const,
    receipts: (params?: Record<string, unknown>) => [...root, "receipts", params] as const,
    receipt: (receiptId: string) => [...root, "receipt", receiptId] as const,
    aging: (params?: Record<string, unknown>) => [...root, "aging", params] as const,
    openItems: (params?: Record<string, unknown>) => [...root, "openItems", params] as const,
  },
} as const;
