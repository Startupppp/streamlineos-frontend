import { z } from "zod";

export const orgTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  expiresAt: z
    .string()
    .min(1, "Expiration is required")
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "Expiration must be in the future",
    })
    .refine(
      (value) =>
        new Date(value).getTime() <= Date.now() + 90 * 24 * 60 * 60 * 1000,
      { message: "CRM API keys cannot exceed 90 days" },
    ),
});

export type OrgTokenFormValues = z.infer<typeof orgTokenFormSchema>;
