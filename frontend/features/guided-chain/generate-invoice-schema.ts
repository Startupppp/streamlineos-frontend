import { z } from "zod";

export const GST_RATE_CHOICES = ["0", "5", "12", "18", "28"] as const;

export const generateInvoiceSchema = z.object({
  gstRate: z.enum(GST_RATE_CHOICES),
  discount: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0), {
      message: "Enter a valid amount",
    }),
  dueDate: z.string(),
  notes: z.string().max(2000),
  status: z.enum(["DRAFT", "ISSUED"]),
});

export type GenerateInvoiceFormValues = z.infer<typeof generateInvoiceSchema>;

export const GENERATE_INVOICE_DEFAULTS: GenerateInvoiceFormValues = {
  gstRate: "0",
  discount: "",
  dueDate: "",
  notes: "",
  status: "DRAFT",
};
