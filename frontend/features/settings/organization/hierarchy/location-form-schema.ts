import { z } from "zod";

export const LOCATION_TYPE_ENUM = ["OFFICE", "WAREHOUSE", "STORE", "FACTORY", "REMOTE"] as const;

export const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Name must contain at least one letter or number"),
  type: z.enum(LOCATION_TYPE_ENUM),
  address: z.string().trim().max(500).optional(),
});

export type FormValues = z.infer<typeof formSchema>;
