import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const externalSharingModeContract = z.enum([
  "disabled",
  "guests",
  "guests_and_links",
]);

export const sharingSettingsContract = z.object({
  externalSharing: externalSharingModeContract,
  guestGrantMaxDays: z.number().int(),
  shareLinkMaxDays: z.number().int(),
  guestAllowDownloadDefault: z.boolean(),
  shareLinkAllowDownloadDefault: z.boolean(),
});

export const spaceSharingPolicyContract = z.object({
  externalSharing: externalSharingModeContract.nullable(),
  effective: externalSharingModeContract,
});

export const guestGrantResponseContract = z.object({
  grantId: z.number().int(),
  recipient: z.object({
    email: z.string(),
    name: z.string().nullable(),
    status: z.enum(["invited", "active"]),
  }),
  access: z.literal("view"),
  expiresAt: z.string(),
  allowDownload: z.boolean(),
});

export const shareLinkItemContract = z.object({
  id: z.number().int(),
  pageId: z.number().int(),
  access: z.literal("view"),
  allowDownload: z.boolean(),
  expiresAt: z.string(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  lastAccessedAt: z.string().nullable(),
  isExpired: z.boolean(),
  isRevoked: z.boolean(),
});

export const shareLinkCreatedContract = shareLinkItemContract.extend({
  token: z.string(),
});

export const shareLinkListContract = cursorPageContract(shareLinkItemContract);

const inventoryPageInfoContract = z.object({
  id: z.number().int(),
  title: z.string(),
  kind: z.string(),
  spaceId: z.number().int().nullable(),
});

const inventoryBaseContract = z.object({
  id: z.number().int(),
  page: inventoryPageInfoContract,
  access: z.string(),
  expiresAt: z.string().nullable(),
  allowDownload: z.boolean(),
  lastActivityAt: z.string().nullable(),
  status: z.enum(["active", "expired", "policy_blocked"]),
});

export const inventoryGuestItemContract = inventoryBaseContract.extend({
  type: z.literal("guest"),
  recipient: z.object({
    email: z.string(),
    name: z.string().nullable(),
    portalMembershipId: z.string(),
  }),
});

export const inventoryLinkItemContract = inventoryBaseContract.extend({
  type: z.literal("link"),
  createdBy: z.object({ membershipId: z.number().int().nullable() }),
});

export const inventoryItemContract = z.discriminatedUnion("type", [
  inventoryGuestItemContract,
  inventoryLinkItemContract,
]);

export const inventoryPageContract = cursorPageContract(inventoryItemContract);

export const bulkRevokeResultContract = z.object({ revoked: z.number().int() });
