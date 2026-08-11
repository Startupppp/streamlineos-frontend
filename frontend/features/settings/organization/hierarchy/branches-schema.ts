import { z } from "zod";

export const NO_BUSINESS_UNIT = "none";

export const branchFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine(
      (v) => /[\p{L}\p{N}]/u.test(v),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  businessUnitId: z.string().optional(),
  managerUserId: z.string().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
