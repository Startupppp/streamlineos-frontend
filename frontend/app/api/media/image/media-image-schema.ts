import { z } from "zod";

const OBJECT_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;

export const mediaImageQuerySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(1000)
    .regex(OBJECT_KEY)
    .refine((key) => !key.includes("..")),
});
