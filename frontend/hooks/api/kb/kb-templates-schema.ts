import { z } from "zod";

const kbPageTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()).nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbPageTemplateListContract = z.array(kbPageTemplateContract);
export const kbPageTemplateSingleContract = kbPageTemplateContract;
export const kbPageTemplateSuccessContract = z.object({ success: z.boolean() });
