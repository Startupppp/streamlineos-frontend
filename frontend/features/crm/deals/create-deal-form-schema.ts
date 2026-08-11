import { z } from "zod";

export const createDealSchema = z.object({
  name: z
    .string()
    .min(1, "Deal name is required")
    .regex(/^[A-Za-z]/, "Name must start with a letter"),
  value: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || Number(v) >= 0, "Value cannot be negative"),
  stage: z.string().min(1),
  probability: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || (Number(v) >= 0 && Number(v) <= 100),
      "Must be between 0 and 100",
    ),
  contactPerson: z
    .string()
    .regex(/^[A-Za-z\s]*$/, "Only letters allowed")
    .optional()
    .or(z.literal("")),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateDealFormValues = z.infer<typeof createDealSchema>;
