import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const apiTokenItemContract = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  isRevoked: z.boolean(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const apiTokensPageContract = cursorPageContract(apiTokenItemContract);

export const createApiTokenContract = z.object({
  token: z.string(),
  apiKey: apiTokenItemContract,
});

export const revokeApiTokenContract = z.object({ success: z.literal(true) });

export type ApiTokenItem = z.infer<typeof apiTokenItemContract>;
export type ApiTokensPage = z.infer<typeof apiTokensPageContract>;
export type CreateApiTokenResult = z.infer<typeof createApiTokenContract>;
