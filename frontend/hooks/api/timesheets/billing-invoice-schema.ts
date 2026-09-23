import { z } from "zod";
import { invoiceLineDetailContract } from "@/hooks/api/invoices/project-invoice-line-detail-schema";

export const uninvoicedEntryContract = z.object({
  id: z.number().int(),
  projectId: z.number().int().nullable(),
  projectName: z.string().nullable(),
  date: z.string(),
  hours: z.string(),
  billRate: z.string().nullable(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  invoiceLineDetail: invoiceLineDetailContract.nullable(),
});

export const uninvoicedEntriesResponseContract = z.object({
  items: z.array(uninvoicedEntryContract),
});

export const invoiceFromTimesheetsResponseContract = z.object({
  invoice: z.object({
    id: z.number().int(),
    invoiceNumber: z.string(),
    status: z.string(),
    currency: z.string(),
    total: z.string(),
    projectId: z.number().int().nullable(),
  }),
  timesheetEntryIds: z.array(z.number().int()),
  posted: z.boolean(),
});

export type UninvoicedEntry = z.infer<typeof uninvoicedEntryContract>;
export type InvoiceFromTimesheetsResult = z.infer<
  typeof invoiceFromTimesheetsResponseContract
>;
