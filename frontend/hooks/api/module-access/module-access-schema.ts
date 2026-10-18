import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";
import { dataScopeContract } from "@/hooks/api/access-schema";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import { idCursorPageContract } from "@/hooks/api/id-cursor-page-schema";
import type {
  AuditCursorPage,
  AuditLogEntry,
  CursorPaginatedResult,
  MemberGrant,
  ModuleGroupMember,
  ModuleMember,
  ModuleMemberCandidate,
  ModuleMyPermissions,
  ModuleOwnership,
  ModulePermission,
  ModuleRoleGroup,
} from "./types";

export const moduleMyPermissionsContract: ResponseContract<ModuleMyPermissions> =
  z.object({
    permissions: z.array(
      z.object({ key: z.string(), scope: dataScopeContract }),
    ),
    isOrgOwner: z.boolean(),
    isOrgAdmin: z.boolean(),
    isModuleOwner: z.boolean(),
    isModuleAdmin: z.boolean(),
  });

export const moduleCatalogContract: ResponseContract<ModulePermission[]> =
  z.array(
    z.object({
      name: z.string(),
      resource: z.string(),
      action: z.string(),
      description: z.string(),
      scopable: z.boolean().optional(),
    }),
  );


const moduleMemberGroupContract = z.object({
  id: z.number(),
  name: z.string(),
});

export const moduleRoleGroupContract: ResponseContract<ModuleRoleGroup> =
  z.object({
    id: z.number(),
    name: z.string(),
    isSystem: z.boolean(),
    version: z.number(),
    memberCount: z.number(),
    permissions: z.array(
      z.object({ permissionKey: z.string(), scope: dataScopeContract }),
    ),
  });

export const moduleRoleGroupPageContract: ResponseContract<
  AuditCursorPage<ModuleRoleGroup>
> = cursorPageContract(moduleRoleGroupContract);

export const moduleGroupMembersContract: ResponseContract<ModuleGroupMember[]> =
  z.array(
    z.object({
      userId: z.string(),
      displayName: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  );

export const moduleMemberContract: ResponseContract<ModuleMember> = z.object({
  membershipId: z.number(),
  userId: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  groups: z.array(moduleMemberGroupContract),
});

export const moduleMemberPageContract: ResponseContract<
  CursorPaginatedResult<ModuleMember>
> = idCursorPageContract(moduleMemberContract);

export const moduleMemberCandidatePageContract: ResponseContract<
  CursorPaginatedResult<ModuleMemberCandidate>
> = idCursorPageContract(
  z.object({
    userId: z.string(),
    displayName: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
    moduleAccessRevoked: z.boolean(),
  }),
);

export const moduleMemberGrantsContract: ResponseContract<{
  grants: MemberGrant[];
}> = z.object({
  grants: z.array(
    z.object({
      permissionKey: z.string(),
      scope: dataScopeContract,
      reason: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export const moduleAuditLogPageContract: ResponseContract<
  AuditCursorPage<AuditLogEntry>
> = cursorPageContract(
  z.object({
    id: z.number(),
    action: z.string(),
    actorUserId: z.string(),
    actorName: z.string(),
    actorEmail: z.string(),
    targetId: z.string().nullable(),
    targetType: z.string().nullable(),
    targetName: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
  }),
);

export const moduleOwnershipContract: ResponseContract<ModuleOwnership> =
  z.object({
    moduleKey: z.string(),
    ownerId: z.string(),
    ownerDisplayName: z.string(),
    ownerEmail: z.string(),
    pendingTransfer: z
      .object({
        transferId: z.string(),
        toUserId: z.string(),
        toDisplayName: z.string(),
        toEmail: z.string(),
        initiatedAt: z.string(),
      })
      .nullable(),
  });

export const moduleSuccessContract = z.object({ success: z.literal(true) });

export const moduleMemberGrantsSetContract = z.object({
  success: z.literal(true),
  granted: z.number(),
});

export const moduleGrantableContract = z.object({
  grantableRanks: z.array(z.number()),
  scopeCeiling: dataScopeContract,
  canGrantModuleOwnership: z.boolean(),
  isOrgOwner: z.boolean(),
  isOrgAdmin: z.boolean(),
});

export type ModuleGrantable = z.infer<typeof moduleGrantableContract>;
