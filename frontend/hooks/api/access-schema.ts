import { z } from "zod";
import type { Permission } from "@/lib/rbac/permissions";
import { isPermissionKey } from "@/contracts/permission-key.generated";
import type { ResponseContract } from "@/lib/api-envelope";
import { moduleDenialReasonContract } from "@/lib/page-state/page-state-schema";


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
  moduleReasons: z.record(z.string(), moduleDenialReasonContract).optional(),
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

const permissionRowContract = z.object({
  name: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string(),
  scopable: z.boolean().optional(),
  baselineScope: z.enum(["own", "all"]).optional(),
  sensitive: z.literal(true).optional(),
});

type PermissionRow = z.infer<typeof permissionRowContract>;

function isCataloguedRow(row: PermissionRow): row is PermissionRow & Permission {
  return isPermissionKey(row.name);
}

export const permissionCatalogContract: ResponseContract<Permission[]> = z
  .array(permissionRowContract)
  .transform((rows) => rows.filter(isCataloguedRow));

export type DataScope = z.infer<typeof dataScopeContract>;
export type AccessResponse = z.infer<typeof accessResponseContract>;
export type RbacDiscoveryGrantable = z.infer<
  typeof rbacDiscoveryGrantableContract
>;
export type RbacDiscoveryMember = z.infer<typeof rbacDiscoveryMemberContract>;
