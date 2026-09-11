import { z } from "zod";

export const userTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scopes: z.array(z.string()).min(1, "Select at least one permission"),
  expiresAt: z
    .string()
    .min(1, "Expiration is required")
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "Expiration must be in the future",
    })
    .refine(
      (value) =>
        new Date(value).getTime() <= Date.now() + 366 * 24 * 60 * 60 * 1000,
      { message: "Personal tokens cannot exceed one year" },
    ),
});

export type UserTokenFormValues = z.infer<typeof userTokenFormSchema>;
