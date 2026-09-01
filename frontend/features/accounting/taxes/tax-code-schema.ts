import { z } from "zod";

export const taxCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  rate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid rate (e.g. 18 or 5.50)"),
  taxType: z.enum(["GST", "CGST_SGST", "IGST", "VAT", "TDS", "TCS", "EXEMPT", "ZERO_RATED"]),
  isReverseCharge: z.boolean(),
  isActive: z.boolean(),
});

export type TaxCodeFormValues = z.infer<typeof taxCodeSchema>;
