import { z } from "zod";

export const agentTokenCreateContract = z.object({
  token: z.string(),
  id: z.number().int(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

const agentTokenListItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const agentTokenListContract = z.array(agentTokenListItemContract);

export const agentTokenSuccessContract = z.object({ success: z.literal(true) });
