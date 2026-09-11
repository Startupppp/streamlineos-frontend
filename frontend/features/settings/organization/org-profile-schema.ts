import { z } from "zod";

/**
 * The organization-profile form contract: the industry vocabulary the picker
 * offers and the Zod schema the general-settings form validates against.
 *
 * §6 puts a feature's schema in its own `*-schema.ts` rather than inline in the
 * component; the industry list is part of the same contract because the schema
 * accepts whatever it offers.
 */

export const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Retail & E-commerce",
  "Manufacturing", "Education", "Real Estate", "Logistics & Supply Chain",
  "Marketing & Advertising", "Consulting", "Legal", "Media & Entertainment",
  "Hospitality & Travel", "Non-profit", "Other",
] as const;

export const orgGeneralSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  legalName: z.string().max(200).optional(),
  orgCode: z.string().max(20).optional(),
  industry: z.string().optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  registrationNumber: z.string().max(100).optional(),
  taxNumber: z.string().max(100).optional(),
  supportEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  supportPhone: z.string().max(30).optional(),
});

export type OrgGeneralValues = z.infer<typeof orgGeneralSchema>;
