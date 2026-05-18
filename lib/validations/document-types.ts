import { z } from "zod";

export const documentTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Sort order must be a non-negative number",
    }),
  applicableRoles: z.array(z.string()),
});

export type DocumentTypeFormValues = z.infer<typeof documentTypeFormSchema>;
