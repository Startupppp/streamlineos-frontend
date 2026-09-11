import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * A personal API token IS a credential: `scopes` is the exact set of permission
 * keys the backend will honour when that token authenticates, and `expiresAt`
 * is the only thing that ends it. Both were read through an unchecked
 * `apiClient.get<T>` cast, so a renamed `scopes` column would have rendered
 * every token as unscoped — a screen that says a live credential grants nothing.
 *
 * Derived from the backend projection in
 * `streamlineos-backend/src/modules/api-tokens/user/user-api-tokens.service.ts`
 * `list()`, over `user_api_tokens`: `scopes` is `text[] NOT NULL DEFAULT '{}'`,
 * `expires_at` and `last_used_at` are nullable timestamps and `created_at` is
 * not, and the page is the shared `buildCursorPage` envelope.
 *
 * The raw token is returned exactly once, by the create call, and never by a
 * read — `createUserApiTokenResponseContract` is the only contract that carries
 * it, which keeps that asymmetry visible rather than implied.
 *
 * Not `.strict()`: an added backend field is a compatible deploy. A removed,
 * renamed or retyped one is what these reject.
 */

export const userApiTokenContract = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type UserApiToken = z.infer<typeof userApiTokenContract>;

export const userApiTokenPageContract = cursorPageContract(userApiTokenContract);

export type UserApiTokenPage = {
  data: UserApiToken[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};

export const createUserApiTokenResponseContract = userApiTokenContract.extend({
  rawToken: z.string(),
});

export type CreateUserApiTokenResponse = z.infer<
  typeof createUserApiTokenResponseContract
>;

export interface CreateUserApiTokenInput {
  name: string;
  scopes: string[];
  expiresAt: string;
}

