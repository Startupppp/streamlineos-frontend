import { z } from "zod";

const customer360SectionSchema = z.object({
  items: z.array(z.object({ id: z.number().int() })),
  total: z.number().int(),
});

export const customer360Contract = z.object({
  contacts: customer360SectionSchema.optional(),
  leads: customer360SectionSchema.optional(),
  deals: customer360SectionSchema.optional(),
  quotes: customer360SectionSchema.optional(),
  invoices: customer360SectionSchema.optional(),
  payments: customer360SectionSchema.optional(),
  supportTickets: customer360SectionSchema.optional(),
  surveys: customer360SectionSchema.optional(),
  activities: customer360SectionSchema.optional(),
  projects: customer360SectionSchema.optional(),
  signedDocuments: customer360SectionSchema.optional(),
});

export const customer360TimelineContract = z.object({
  items: z.array(z.object({
    type: z.enum(["contact_created", "deal_created", "lead_linked"]),
    entityId: z.number().int(),
    label: z.string(),
    meta: z.string().nullable(),
    date: z.string(),
  })),
  nextCursor: z.string().nullable(),
});
