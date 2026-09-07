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

const transferItemContract = z.object({
  id: z.string(),
  scope: z.string(),
  moduleKey: z.string().nullable(),
  fromMembershipId: z.number(),
  initiatedByMembershipId: z.number(),
  toMembershipId: z.number(),
  status: z.string(),
  initiatedAt: z.string(),
  respondedAt: z.string().nullable(),
  expiresAt: z.string(),
  reason: z.string().nullable(),
});

export const transfersPageContract = cursorPageContract(transferItemContract);

const incomingTransferItemContract = z.object({
  id: z.string(),
  scope: z.string(),
  moduleKey: z.string().nullable(),
  fromMembershipId: z.number(),
  initiatedByMembershipId: z.number(),
  toMembershipId: z.number(),
  status: z.string(),
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
