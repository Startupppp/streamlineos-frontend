import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const kbPageGrantItemContract = z.object({
  id: z.number().int(),
  pageId: z.number().int(),
  membershipId: z.number().int().nullable(),
  role: z.string().nullable(),
  access: z.enum(["view", "comment", "edit"]),
  grantedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
});

export const kbPageGrantListContract = cursorPageContract(kbPageGrantItemContract);
export const kbPageGrantContract = kbPageGrantItemContract;
