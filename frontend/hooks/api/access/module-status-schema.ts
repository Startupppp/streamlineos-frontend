import { z } from "zod";

/**
 * Which modules an organization has, and which of them a single member is
 * allowed into. The two routes look interchangeable and are not:
 *
 *   · `GET /access/org-modules` emits `core: true` ONLY for a core module —
 *     the key is ABSENT for every plan-gated one, never `false`.
 *   · `GET /access/user-module-access/:userId` always emits `core` as a real
 *     boolean, and its `enabled` means "not individually denied", which does
 *     not account for the org's plan entitlement at all.
 *
 * Sharing one schema between them would let a missing `core` pass where it is
 * mandatory, so they are declared separately on purpose.
 */

export const orgModuleStatusContract = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
  core: z.literal(true).optional(),
});

export const orgModuleStatusesContract = z.array(orgModuleStatusContract);

export const userModuleAccessContract = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
  core: z.boolean(),
});

export const userModuleAccessListContract = z.array(userModuleAccessContract);

export type OrgModuleStatus = z.infer<typeof orgModuleStatusContract>;
export type UserModuleAccessEntry = z.infer<typeof userModuleAccessContract>;
