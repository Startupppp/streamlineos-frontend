import { z } from "zod";

const emailTemplateSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const emailTemplatesListContract = z.array(emailTemplateSchema);
export const emailTemplateContract = emailTemplateSchema;

export const deleteEmailTemplateContract = z.object({ success: z.boolean() });
