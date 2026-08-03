import { z } from "zod";

export const createSecretSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, digits, underscores only"),
  value: z.string().min(1, "Secret value is required"),
  description: z.string().optional(),
});

export type CreateSecretValues = z.infer<typeof createSecretSchema>;
