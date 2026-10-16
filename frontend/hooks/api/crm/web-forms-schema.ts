import { z } from "zod";

/**
 * Wire contracts for `crm/web-forms` (crm-web-forms-response.schemas.ts) and the
 * public `public/lead-form/:token` pair (public-response.schemas.ts).
 */

const webFormFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const webFormContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  fields: z.array(webFormFieldSchema),
  publicToken: z.string(),
  isActive: z.boolean(),
  submitMessage: z.string(),
  redirectUrl: z.string().nullable(),
  totalSubmissions: z.number().int(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webFormListContract = z.array(webFormContract);

export const publicLeadFormContract = z.object({
  form: z.object({
    name: z.string(),
    fields: z.array(webFormFieldSchema),
    submitMessage: z.string(),
    redirectUrl: z.string().nullable(),
    isActive: z.boolean(),
  }),
});

export const submitLeadFormContract = z.object({
  success: z.boolean(),
  message: z.string(),
  redirectUrl: z.string().nullable(),
});

export type WebForm = z.infer<typeof webFormContract>;
export type WebFormField = z.infer<typeof webFormFieldSchema>;
export type PublicLeadForm = z.infer<typeof publicLeadFormContract>["form"];
