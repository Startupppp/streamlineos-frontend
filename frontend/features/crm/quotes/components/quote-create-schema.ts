import * as z from "zod";

export const quoteLineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.string().min(1, "Required"),
  unitPrice: z.string().min(1, "Required"),
  taxRate: z.string().optional(),
});

export const quoteFormSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  description: z.string().optional(),
  currency: z.string(),
  validUntil: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  pricebookId: z.string().optional(),
  templateId: z.string().optional(),
  discountPercent: z.string().optional(),
  lineItems: z.array(quoteLineItemSchema).min(1, "At least one line item required"),
});

export type QuoteCreateFormValues = z.infer<typeof quoteFormSchema>;
