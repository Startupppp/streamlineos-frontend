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
]);

export const importRowOutcomeSchema = z.enum([
  "IMPORTED",
  "SKIPPED",
  "FAILED",
  "ROLLED_BACK",
]);

export const importModeSchema = z.enum(["atomic", "partial"]);

export const importPreviewValuesSchema =
  ticketImportExportPreviewImportResponseSchema.shape.rows.element.shape.values;

export type ImportFormat = z.infer<typeof importFormatSchema>;
export type ImportMode = z.infer<typeof importModeSchema>;
export type ImportIssueKind = z.infer<typeof importIssueKindSchema>;
export type ImportRowIssue = TicketImportExportPreviewImportResponse["issues"][number];
export type ImportRowResult = TicketImportExportCommitImportResponse["rows"][number];
