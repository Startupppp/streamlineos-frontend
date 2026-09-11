import { z } from "zod";

export const emailTemplateContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  category: z.string(),
  variables: z.array(z.string()).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const emailTemplateListContract = z.array(emailTemplateContract);

export const emailTemplateAiContract = z.object({
  subject: z.string(),
  body: z.string(),
});

export const deleteEmailTemplateResponseContract = z.object({
  success: z.boolean(),
});
