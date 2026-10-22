import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const delegationItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  delegatorMembershipId: z.number(),
  delegateeMembershipId: z.number(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  reason: z.string().nullable(),
  status: z.string(),
  revokedAt: z.string().nullable(),
  revokedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  permissions: z.array(z.string()),
  delegatorName: z.string().nullable(),
  delegateeName: z.string().nullable(),
  lifecycle: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED", "REVOKED"]),
});

export const delegationsPageContract = cursorPageContract(delegationItemContract);

export const delegationRowContract = delegationItemContract;

export type DelegationItem = z.infer<typeof delegationItemContract>;
export type DelegationsPage = z.infer<typeof delegationsPageContract>;
