import { z } from "zod";

/**
 * Ably's signed `TokenRequest`. `capability` is what scopes the realtime
 * connection to the caller's channels, so a response missing it must fail the
 * read rather than reach `authCallback` and open a wider connection than the
 * server authorised — the backend's `chatAblyTokenSchema` marks it optional,
 * Ably's own `createTokenRequest` always signs one.
 */
export const ablyTokenRequestContract = z.object({
  keyName: z.string(),
  capability: z.string(),
  mac: z.string(),
  nonce: z.string(),
  timestamp: z.number(),
  clientId: z.string().optional(),
  ttl: z.number().optional(),
});
