import { z } from "zod";
import { invoiceLineDetailContract } from "@/hooks/api/invoices/project-invoice-line-detail-schema";

export const invoiceLineDetailFormSchema = z.object({
  invoiceLineDetail: invoiceLineDetailContract,
});

export type InvoiceLineDetailFormValues = z.infer<
  typeof invoiceLineDetailFormSchema
>;
