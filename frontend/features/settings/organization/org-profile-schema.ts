import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

const httpUrlOrEmpty = z
  .string()
  .url("Must be a valid URL")
  .refine((v) => /^https?:\/\//i.test(v), "Only http: or https: URLs are accepted")
  .or(z.literal(""))
  .optional();

export const orgGeneralSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  legalName: z.string().max(200, "Legal name must be at most 200 characters").optional(),
  orgCode: z.string().max(20).optional(),
  industry: z.string().optional(),
  website: httpUrlOrEmpty,
  registrationNumber: z.string().max(100, "Registration number must be at most 100 characters").optional(),
  taxNumber: z.string().max(100).optional(),
  supportEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  supportPhone: z
    .string()
    .max(30)
    .refine((val) => !val || isValidPhoneNumber(val), "Enter a valid phone number")
    .optional(),
});

export type OrgGeneralValues = z.infer<typeof orgGeneralSchema>;
