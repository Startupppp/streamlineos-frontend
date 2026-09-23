import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `PortalAccessController` handlers.
 *
 * Derived from `portal-access-response.schemas.ts` in the backend.
 * NOT `.strict()`. Timestamps are ISO strings.
 */

const membershipListItemContract = z.object({
  portalMembershipId: z.string(),
  organizationId: z.string(),
  audience: z.string().nullable(),
  partyContactId: z.string(),
  userId: z.string().nullable(),
  userMembershipId: z.number().nullable(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REVOKED"]),
  sessionEpoch: z.number(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contactFirstName: z.string().nullable(),
  contactLastName: z.string().nullable(),
});

export const membershipListContract = cursorPageContract(membershipListItemContract);

const grantListItemContract = z.object({
  projectClientGrantId: z.string(),
  organizationId: z.string(),
  portalMembershipId: z.string(),
  partyContactId: z.string(),
  projectId: z.number(),
  canViewMilestones: z.boolean(),
  canViewTasks: z.boolean(),
  canViewAttachments: z.boolean(),
  canViewComments: z.boolean(),
  canSubmitChangeRequests: z.boolean(),
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"]),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contactFirstName: z.string().nullable(),
  contactLastName: z.string().nullable(),
});

export const grantListContract = cursorPageContract(grantListItemContract);

const grantRowContract = z.object({
  projectClientGrantId: z.string(),
  organizationId: z.string(),
  portalMembershipId: z.string(),
  partyContactId: z.string(),
  projectId: z.number(),
  canViewMilestones: z.boolean(),
  canViewTasks: z.boolean(),
  canViewAttachments: z.boolean(),
  canViewComments: z.boolean(),
  canSubmitChangeRequests: z.boolean(),
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"]),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contactFirstName: z.string().nullable().optional().transform((v) => v ?? null),
  contactLastName: z.string().nullable().optional().transform((v) => v ?? null),
});

export const grantContract = grantRowContract;

export type GrantItem = z.infer<typeof grantRowContract>;
