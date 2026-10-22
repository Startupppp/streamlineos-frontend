import { z } from "zod";

export const ablyTokenRequestContract = z.object({
  keyName: z.string(),
  capability: z.string(),
  mac: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
  clientId: z.string().optional(),
  ttl: z.number().optional(),
});
