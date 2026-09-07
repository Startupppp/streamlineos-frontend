import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const payslipTemplateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  layout: z.string(),
  config: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payslipTemplateListContract = cursorPageContract(payslipTemplateContract);

export const previewTemplateResponseContract = z.object({
  html: z.string(),
});

export type PayslipTemplate = z.infer<typeof payslipTemplateContract>;
