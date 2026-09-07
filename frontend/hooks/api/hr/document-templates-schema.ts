import { z } from "zod";

export const documentTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  type: z.string(),
  htmlContent: z.string(),
  variables: z.array(z.string()),
  version: z.number().int(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const documentTemplateListContract = z.array(documentTemplateContract);

export const successBoolContract = z.object({ success: z.boolean() });
