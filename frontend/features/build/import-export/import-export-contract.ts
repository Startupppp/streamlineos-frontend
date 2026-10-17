import { z } from "zod";
import {
  ticketImportExportPreviewImportResponseSchema,
  type TicketImportExportPreviewImportResponse,
  type TicketImportExportCommitImportResponse,
} from "@/contracts/build-contracts.generated";

export const importFormatSchema = z.enum(["csv", "json"]);

export const importIssueKindSchema = z.enum([
  "INVALID",
  "DUPLICATE_IN_FILE",
  "DUPLICATE_EXISTING",
  "STATUS_DEFAULTED",
]);

export const importModeSchema = z.enum(["atomic", "partial"]);

const generatedRow = ticketImportExportPreviewImportResponseSchema.shape.rows.element;

// `labels` and `labelsToCreate` are declared here as well as in the generated
// contract, so the dry run keeps them before and after a contract regeneration.
export const importPreviewValuesSchema = generatedRow.shape.values.extend({
  labels: z.array(z.string()).optional(),
});

export const ticketImportPreviewContract = ticketImportExportPreviewImportResponseSchema.extend({
  rows: z.array(generatedRow.extend({ values: importPreviewValuesSchema })),
  labelsToCreate: z.array(z.string()).default([]),
});

export type TicketImportPreview = z.infer<typeof ticketImportPreviewContract>;

export type ImportFormat = z.infer<typeof importFormatSchema>;
export type ImportMode = z.infer<typeof importModeSchema>;
export type ImportIssueKind = z.infer<typeof importIssueKindSchema>;
export type ImportRowIssue = TicketImportExportPreviewImportResponse["issues"][number];
export type ImportRowResult = TicketImportExportCommitImportResponse["rows"][number];
