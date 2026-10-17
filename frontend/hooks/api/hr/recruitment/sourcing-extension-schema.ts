import { z } from "zod";

/**
 * The token, returned exactly once.
 *
 * Nothing lists it afterwards — `GET /me/api-tokens` returns the prefix and the
 * expiry, never the secret — so the screen either shows it at this moment or
 * the recruiter issues another one.
 */
export const extensionTokenContract = z.object({
  token: z.string(),
  tokenId: z.string(),
  expiresAt: z.coerce.date(),
  scopes: z.array(z.string()),
});

export type ExtensionToken = z.infer<typeof extensionTokenContract>;
