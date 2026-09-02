import { z } from "zod";

export const companySchema = z.object({
  baseCurrency: z.string().min(1),
  fiscalYearStartMonth: z.string().min(1),
  accountingBasis: z.enum(["ACCRUAL", "CASH"]),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export const taxSchema = z.object({
  gstin: z.string(),
  pan: z.string(),
  stateCode: z.string(),
});

export type TaxFormValues = z.infer<typeof taxSchema>;
