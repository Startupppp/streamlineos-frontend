import { z } from "zod";

export const proxyAccessContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grantorUserId: z.string(),
  grantorMembershipId: z.number().int().nullable(),
  proxyUserId: z.string(),
  proxyMembershipId: z.number().int().nullable(),
  scope: z.enum(["approvals", "hr_admin", "manager_tasks"]),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().nullable(),
  active: z.boolean(),
  disallowSensitive: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const delegationsListContract = z.object({
  data: z.array(proxyAccessContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type ProxyAccessResponse = z.infer<typeof proxyAccessContract>;
export type DelegationsListResponse = z.infer<typeof delegationsListContract>;

export const proxyDeleteContract = z.undefined();
