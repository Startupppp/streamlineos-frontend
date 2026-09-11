import { z } from "zod";

export const salaryTemplateRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  basicSalary: z.string(),
  hraPercent: z.string(),
  specialAllowance: z.string().nullable(),
  medicalAllowance: z.string().nullable(),
  travelAllowance: z.string().nullable(),
  otherAllowances: z.string().nullable(),
  pfDeductionPercent: z.string().nullable(),
  professionalTax: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const salaryTemplateListContract = z.object({
  data: z.array(salaryTemplateRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type SalaryTemplateRow = z.infer<typeof salaryTemplateRowContract>;
export type SalaryTemplateList = z.infer<typeof salaryTemplateListContract>;

export const salaryDeleteContract = z.undefined();
