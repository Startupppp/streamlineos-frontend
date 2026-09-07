import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const payslipTemplateConfigContract = z.object({
  accent: z.string(),
  showEmployerContributions: z.boolean(),
  showYtd: z.boolean(),
});

export const payslipTemplateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  layout: z.enum(["CLASSIC", "MODERN", "COMPLIANCE"]),
  config: payslipTemplateConfigContract,
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payslipTemplateListContract = cursorPageContract(payslipTemplateContract);

export const previewTemplateResponseContract = z.object({
  html: z.string(),
});

export type PayslipTemplate = z.infer<typeof payslipTemplateContract>;
