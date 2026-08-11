import { z } from "zod";

export const teamFormSchema = z.object({
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
    .min(2, "At least 2 characters")
    .max(20, "Max 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  departmentId: z.string().min(1, "Department is required"),
  leadUserId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  capacity: z.string().optional(),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;
