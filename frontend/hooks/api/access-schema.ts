import { z } from "zod";
import type { Permission } from "@/lib/rbac/permissions";
import type { ResponseContract } from "@/lib/api-envelope";

/**
 * Response contracts for the access endpoints. Everything a permission check
 * rests on is validated here, because a silently-dropped `scopes` or a `modules`
 * map that arrives under a new name reads as "this user may do nothing" — a
 * lockout that looks exactly like a correct denial.
 *
 * Not `.strict()`: an added backend field is a compatible deploy. A removed,
 * renamed or retyped one is what these reject.
 *
 * `mfa`, `version` and `membershipId` stay optional against a backend that
 * always sends them. `/me/access` is the endpoint whose failure locks every
 * screen, so a field is pinned only where losing it would be worse than that.
 * Nothing reads `mfa` or `version` for a decision; `membershipId` is read by
 * the timesheets delegate banner, which is built to say nothing at all when the
 * caller has no membership — so its absence degrades to silence rather than to
 * a false claim, and pinning it would trade that for a lockout.
 */

export const dataScopeContract = z.enum(["all", "team", "own", "none"]);

export const mfaStateContract = z.object({
  enforced: z.boolean(),
  satisfied: z.boolean(),
});

export const accessResponseContract = z.object({
  membershipId: z.number().nullable().optional(),
  scopes: z.record(z.string(), dataScopeContract),
  isOrgOwner: z.boolean(),
  canManageOrganizationMembership: z.boolean(),
  modules: z.record(z.string(), z.boolean()),
  mfa: mfaStateContract.optional(),
  version: z.number().optional(),
});

export const rbacDiscoveryGrantableContract = z.object({
  grantableKeys: z.array(z.string()),
  assignableRanks: z.array(z.number()),
  allowedModules: z.array(z.string()).nullable(),
});

export const rbacDiscoveryMemberContract = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

export const rbacDiscoveryMembersContract = z.array(rbacDiscoveryMemberContract);

/**
 * `Permission` is owned by the RBAC catalog, not by this file — annotating the
 * contract with it makes the compiler, rather than a reviewer, the thing that
 * keeps the two in step.
 */
export const permissionCatalogContract: ResponseContract<Permission[]> = z.array(
  z.object({
    name: z.string(),
    resource: z.string(),
    action: z.string(),
    description: z.string(),
    baselineScope: z.enum(["own", "all"]).optional(),
  }),
);

export type DataScope = z.infer<typeof dataScopeContract>;
export type AccessResponse = z.infer<typeof accessResponseContract>;
export type RbacDiscoveryGrantable = z.infer<
  typeof rbacDiscoveryGrantableContract
>;
export type RbacDiscoveryMember = z.infer<typeof rbacDiscoveryMemberContract>;
