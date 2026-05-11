import { z } from "zod";

export const DOCUMENT_EXPORT_TYPES = [
  "CONTRACT",
  "CERTIFICATE",
  "ID_PROOF",
  "PAYSLIP",
  "POLICY",
  "OFFER_LETTER",
  "RESUME",
  "OTHER",
] as const;

export const documentExportFiltersSchema = z.object({
  filterUserId: z.string().optional(),
  type: z.enum(DOCUMENT_EXPORT_TYPES).optional(),
  category: z.string().max(200).optional(),
  tag: z.string().max(100).optional(),
  createdFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  uploadedBy: z.string().optional(),
});

export type DocumentExportFilters = z.infer<typeof documentExportFiltersSchema>;

export const documentExportEmailSchema = documentExportFiltersSchema.extend({
  recipients: z.enum(["HR", "CEO", "BOTH"]),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  cc: z.string().max(500).optional(),
  bcc: z.string().max(500).optional(),
});

export type DocumentExportEmailInput = z.infer<typeof documentExportEmailSchema>;

export function formatDocumentExportLabel(filters: DocumentExportFilters): string {
  const parts: string[] = [];
  if (filters.type) parts.push(filters.type.replace(/_/g, " "));
  if (filters.category?.trim()) parts.push(filters.category.trim());
  if (filters.tag?.trim()) parts.push(`tag:${filters.tag.trim()}`);
  if (filters.createdFrom || filters.createdTo) {
    parts.push(
      [filters.createdFrom ?? "…", filters.createdTo ?? "…"].join("–"),
    );
  }
  return parts.length ? parts.join(" · ") : "All matching";
}
