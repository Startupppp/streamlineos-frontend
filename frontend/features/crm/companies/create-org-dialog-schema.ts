import { z } from "zod";

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(COMPANY_SIZES).optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  description: z.string().optional(),
});

export type CreateOrgForm = z.infer<typeof createOrgSchema>;
