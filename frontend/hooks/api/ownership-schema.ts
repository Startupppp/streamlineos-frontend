import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `OwnershipController` handlers.
 *
 * Derived from `ownership-response.schemas.ts` in the backend.
 * NOT `.strict()`. Timestamps are ISO strings.
 */

export const initiateTransferContract = z.object({
  transferId: z.string(),
  expiresAt: z.string(),
});

const transferScopeEnum = z.enum(["ORGANIZATION", "MODULE"]);
const transferStatusEnum = z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"]);

const transferItemContract = z.object({
  id: z.string(),
  scope: transferScopeEnum,
  moduleKey: z.string().nullable(),
  fromMembershipId: z.number(),
  initiatedByMembershipId: z.number(),
  toMembershipId: z.number(),
  status: transferStatusEnum,
  initiatedAt: z.string(),
  respondedAt: z.string().nullable(),
  expiresAt: z.string(),
  reason: z.string().nullable(),
});

export const transfersPageContract = cursorPageContract(transferItemContract);

const incomingTransferItemContract = z.object({
  id: z.string(),
  scope: transferScopeEnum,
  moduleKey: z.string().nullable(),
  fromMembershipId: z.number(),
  initiatedByMembershipId: z.number(),
  toMembershipId: z.number(),
  status: transferStatusEnum,
  initiatedAt: z.string(),
  expiresAt: z.string(),
  reason: z.string().nullable(),
  fromName: z.string().nullable(),
  fromEmail: z.string().nullable(),
});

export const incomingTransfersContract = z.object({
  data: z.array(incomingTransferItemContract),
});

export const ownershipMutationContract = z.object({ success: z.literal(true) });
