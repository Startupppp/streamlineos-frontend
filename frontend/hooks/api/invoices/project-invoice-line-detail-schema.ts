import { z } from "zod";

export const INVOICE_LINE_DETAIL_VALUES = ["summary", "raw"] as const;

export const invoiceLineDetailContract = z.enum(INVOICE_LINE_DETAIL_VALUES);

export const projectInvoiceLineDetailContract = z.object({
  projectId: z.number().int(),
  invoiceLineDetail: invoiceLineDetailContract,
});

export type InvoiceLineDetail = z.infer<typeof invoiceLineDetailContract>;
export type ProjectInvoiceLineDetail = z.infer<
  typeof projectInvoiceLineDetailContract
>;

export const SAFE_INVOICE_LINE_DETAIL: InvoiceLineDetail = "summary";

export function safestInvoiceLineDetail(
  values: ReadonlyArray<InvoiceLineDetail | null>,
): InvoiceLineDetail {
  if (values.length === 0) return SAFE_INVOICE_LINE_DETAIL;
  return values.every((value) => value === "raw")
    ? "raw"
    : SAFE_INVOICE_LINE_DETAIL;
}

export const INVOICE_LINE_DETAIL_LABELS: Record<InvoiceLineDetail, string> = {
  summary: "Summary lines",
  raw: "Verbatim timesheet notes",
};

export const INVOICE_LINE_DETAIL_DESCRIPTIONS: Record<
  InvoiceLineDetail,
  string
> = {
  summary:
    "Each invoice line names the project, the date and the hours billed. The worker's own timesheet note is never sent to the customer.",
  raw: "Each invoice line repeats the worker's timesheet note word for word. Anyone with portal access to this invoice can read it.",
};
