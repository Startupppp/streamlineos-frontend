import { z } from "zod";

export const claimResponseBodySchema = z.object({
  data: z
    .object({
      email: z.string().optional(),
      reference: z.string().optional(),
    })
    .optional(),
  message: z.string().optional(),
});

export type ClaimResponseBody = z.infer<typeof claimResponseBodySchema>;
