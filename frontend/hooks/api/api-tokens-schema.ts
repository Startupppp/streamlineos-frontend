import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `ApiTokensController` (org-level tokens).
 *
 * DISAGREEMENT FIXED: The frontend `ApiToken.id` was `string`, but
 * `api_tokens.id` is a `serial` integer — backend `apiTokenItemSchema.id = z.number().int()`.
 *
 * DISAGREEMENT FIXED: `ApiTokenPage` previously declared `meta.{ page, limit, total, totalPages }`
 * (offset-paged) but the backend wraps with `cursorPageSchema`. Corrected here.
 *
 * Timestamps are ISO strings over JSON (wireDate). NOT `.strict()`.
 */

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
