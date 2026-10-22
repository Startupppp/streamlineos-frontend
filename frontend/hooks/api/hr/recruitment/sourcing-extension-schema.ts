import { z } from "zod";

export const extensionTokenContract = z.object({
  token: z.string(),
  tokenId: z.string(),
  expiresAt: z.coerce.date(),
  scopes: z.array(z.string()),
});

export type ExtensionToken = z.infer<typeof extensionTokenContract>;
