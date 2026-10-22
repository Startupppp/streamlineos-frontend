import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const kbPageGrantItemContract = z.object({
  id: z.number().int(),
  pageId: z.number().int(),
  membershipId: z.number().int().nullable(),
  role: z.string().nullable(),
  access: z.enum(["view", "comment", "edit", "manage"]),
  grantedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isExpired: z.boolean(),
  granteeName: z.string().nullable(),
  granteeEmail: z.string().nullable(),
  granteeImage: z.string().nullable(),
});

export const kbPageGrantListContract = cursorPageContract(kbPageGrantItemContract);
export const kbPageGrantContract = kbPageGrantItemContract;

export const kbPageGrantCandidatesContract = cursorPageContract(z.object({
  membershipId: z.number().int().positive(),
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
}).strict());
