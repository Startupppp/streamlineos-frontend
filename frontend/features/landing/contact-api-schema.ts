import { z } from "zod";

export const contactErrorBodySchema = z.object({
  error: z.string().optional(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});
