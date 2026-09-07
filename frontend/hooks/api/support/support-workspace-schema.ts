import { z } from "zod";

export const supportQueueListContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    filter: z.record(z.string(), z.unknown()),
    sortOrder: z.number().int(),
    isDefault: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    openTicketCount: z.number().int(),
  }),
);

export const supportTagListContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    createdAt: z.string(),
  }),
);

export const supportSavedViewListContract = z.array(
  z.object({
    id: z.number().int(),
    orgId: z.string(),
    ownerMembershipId: z.number().int().nullable(),
    name: z.string(),
    filter: z.record(z.string(), z.unknown()),
    visibility: z.enum(["personal", "team", "global"]),
    sortOrder: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

export const supportWorkspaceSuccessContract = z.object({ success: z.literal(true) });
