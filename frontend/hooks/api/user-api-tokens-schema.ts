import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


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

