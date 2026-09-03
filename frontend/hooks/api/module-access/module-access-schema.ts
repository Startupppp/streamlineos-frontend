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

/**
 * Module-scoped access reads. `moduleMyPermissionsContract` decides which
 * controls a module owner or admin is shown, so a dropped `isModuleOwner` is a
 * silent demotion rather than a visible failure.
 *
 * Both types are owned by `./types`, which the module's other hooks share;
 * annotating rather than re-inferring keeps one definition and lets the
 * compiler enforce that the contract still matches it.
 */
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

/**
 * The rest of the module-access surface. Every route below decides who may do
 * what inside a module, and each was an unchecked `apiClient.get<T>` cast until
 * these landed — the same shape of hole that shipped the chat `members[]` and
 * huddle `userId` defects, on a surface where the consequence is a wrong
 * permission screen rather than a wrong avatar.
 *
 * Derived from the backend PROJECTION, not from the frontend type. Sources
 * (streamlineos-backend):
 *   groups            module-access-group-crud.service.ts hydrateGroups()
 *   members           module-access-roster.service.ts listMembers()
 *   group members     module-access-group-members.service.ts ModuleGroupMember
 *   candidates        module-access-roster.service.ts listMemberCandidates()
 *   grants            user-permission-grants.service.ts listGrants()
 *   audit log         module-access.service.ts getAuditLog()
 *   ownership         module-access-ownership.service.ts fetchOwnership()
 *
 * Three details the frontend types get wrong and these contracts do not:
 * `avatarUrl` is always PRESENT and nullable (`users.image`), never absent;
 * `email` is coalesced to `""` server-side so it is never null; and the audit
 * row's `id` is a `serial`, so it is always a number.
 */

const moduleMemberGroupContract = z.object({
  id: z.number(),
  name: z.string(),
});

export const moduleRoleGroupContract: ResponseContract<ModuleRoleGroup> =
  z.object({
    id: z.number(),
    name: z.string(),
    isSystem: z.boolean(),
    /**
     * The optimistic-concurrency token. `useSetModuleGroupPermissions` sends it
     * back in the PUT body, so a `version` that silently stopped arriving would
     * turn every permission write into an unguarded last-write-wins.
     */
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
