import {
  moduleAuditLogPageContract,
  moduleGroupMembersContract,
  moduleMemberCandidatePageContract,
  moduleMemberGrantsContract,
  moduleMemberPageContract,
  moduleOwnershipContract,
  moduleRoleGroupContract,
  moduleRoleGroupPageContract,
} from "@/hooks/api/module-access/module-access-schema";

/**
 * Two halves, and the second one is the whole point.
 *
 * The ACCEPTS half is built from what the backend actually emits — the
 * projections in `module-access-group-crud.service.ts` (`hydrateGroups`),
 * `module-access-roster.service.ts` (`listMembers` / `listMemberCandidates`),
 * `user-permission-grants.service.ts` (`listGrants`),
 * `module-access.service.ts` (`getAuditLog`) and
 * `module-access-ownership.service.ts` (`fetchOwnership`). A contract that
 * rejects real traffic turns a working permission screen into an error page,
 * and on this surface an error page is a lockout.
 *
 * The BITE half feeds each contract the payload a plausible backend change
 * would produce. A contract copied from `module-access/types.ts` would pass
 * every test in the first half and none in the second — which is the difference
 * between a contract that is satisfiable and one that is true. Every bite here
 * is a rename or a re-nesting of the exact kind that shipped twice already:
 * `members[].membership.user` for a flat `user`, and a `{}` projection that
 * dropped `userId` so every huddle tile read "Unknown".
 */

const GROUP = {
  id: 7,
  name: "HR Admins",
  isSystem: false,
  version: 3,
  memberCount: 12,
  permissions: [
    { permissionKey: "hr:employees:view", scope: "all" },
    { permissionKey: "hr:employees:manage", scope: "team" },
  ],
};

const MEMBER = {
  membershipId: 41,
  userId: "usr_alice",
  displayName: "Alice",
  email: "alice@example.com",
  avatarUrl: null,
  groups: [{ id: 7, name: "HR Admins" }],
};

const CANDIDATE = {
  userId: "usr_bob",
  displayName: "Bob",
  email: "bob@example.com",
  avatarUrl: "https://cdn.example.com/bob.png",
};

const AUDIT_ROW = {
  id: 9001,
  action: "module_access.member_added",
  actorUserId: "usr_alice",
  actorName: "Alice",
  actorEmail: "alice@example.com",
  targetId: "usr_bob",
  targetType: "user",
  targetName: "Bob",
  metadata: { moduleKey: "hr", groupIds: [7] },
  ipAddress: "10.0.0.1",
  createdAt: "2026-09-02T12:00:00.000Z",
};

const OWNERSHIP = {
  moduleKey: "hr",
  ownerId: "usr_alice",
  ownerDisplayName: "Alice",
  ownerEmail: "alice@example.com",
  pendingTransfer: null,
};

describe("the module-access contracts accept what the backend actually builds", () => {
  it("accepts a role group with its hydrated permission grants", () => {
    expect(moduleRoleGroupContract.safeParse(GROUP).success).toBe(true);
  });

  it("accepts a group whose role carries no grant at all, as an empty array", () => {
    expect(
      moduleRoleGroupContract.safeParse({ ...GROUP, permissions: [], memberCount: 0 })
        .success,
    ).toBe(true);
  });

  it("accepts the `{ data, pagination }` envelope groups and the audit log share", () => {
    expect(
      moduleRoleGroupPageContract.safeParse({
        data: [GROUP],
        pagination: { limit: 100, hasMore: false, nextCursor: null },
      }).success,
    ).toBe(true);
    expect(
      moduleAuditLogPageContract.safeParse({
        data: [AUDIT_ROW],
        pagination: { limit: 25, hasMore: true, nextCursor: "MjAyNi0wOS0wMgA5MDAx" },
      }).success,
    ).toBe(true);
  });

  it("accepts the flat `{ data, hasMore, nextCursor }` page the rosters emit", () => {
    expect(
      moduleMemberPageContract.safeParse({
        data: [MEMBER],
        hasMore: true,
        nextCursor: 41,
      }).success,
    ).toBe(true);
    expect(
      moduleMemberCandidatePageContract.safeParse({
        data: [CANDIDATE],
        hasMore: false,
        nextCursor: null,
      }).success,
    ).toBe(true);
  });

  it("accepts a member with no avatar, which arrives as null and not as a missing key", () => {
    expect(moduleMemberContractAccepts({ ...MEMBER, avatarUrl: null })).toBe(true);
  });

  it("accepts a group roster and a grant list, including a grant with no reason", () => {
    expect(moduleGroupMembersContract.safeParse([CANDIDATE]).success).toBe(true);
    expect(
      moduleMemberGrantsContract.safeParse({
        grants: [
          {
            permissionKey: "hr:employees:view",
            scope: "own",
            reason: null,
            createdAt: "2026-09-01T10:00:00.000Z",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts ownership with and without a pending transfer", () => {
    expect(moduleOwnershipContract.safeParse(OWNERSHIP).success).toBe(true);
    expect(
      moduleOwnershipContract.safeParse({
        ...OWNERSHIP,
        pendingTransfer: {
          transferId: "b0a1c2d3-0000-4000-8000-000000000000",
          toUserId: "usr_bob",
          toDisplayName: "Bob",
          toEmail: "bob@example.com",
          initiatedAt: "2026-09-02T09:00:00.000Z",
        },
      }).success,
    ).toBe(true);
  });

  it("accepts an added backend field, because a widening deploy is compatible", () => {
    expect(
      moduleRoleGroupContract.safeParse({ ...GROUP, description: "new field" })
        .success,
    ).toBe(true);
  });
});

function moduleMemberContractAccepts(payload: unknown): boolean {
  return moduleMemberPageContract.safeParse({
    data: [payload],
    hasMore: false,
    nextCursor: null,
  }).success;
}

describe("the module-access contracts reject the drift a cast would swallow", () => {
  it("rejects a group that lost its optimistic-concurrency `version`", () => {
    const { version: _version, ...noVersion } = GROUP;
    expect(moduleRoleGroupContract.safeParse(noVersion).success).toBe(false);
  });

  it("rejects a grant list re-nested under `permission`, the chat defect's shape", () => {
    expect(
      moduleRoleGroupContract.safeParse({
        ...GROUP,
        permissions: [{ permission: { permissionKey: "hr:employees:view", scope: "all" } }],
      }).success,
    ).toBe(false);
  });

  it("rejects a scope outside the four the backend enum can hold", () => {
    expect(
      moduleRoleGroupContract.safeParse({
        ...GROUP,
        permissions: [{ permissionKey: "hr:employees:view", scope: "everything" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a member whose identity moved into a nested `user`", () => {
    const { userId: _userId, displayName: _displayName, ...rest } = MEMBER;
    expect(
      moduleMemberContractAccepts({
        ...rest,
        user: { id: "usr_alice", name: "Alice" },
      }),
    ).toBe(false);
  });

  it("rejects a member whose `membershipId` arrived as a string", () => {
    expect(moduleMemberContractAccepts({ ...MEMBER, membershipId: "41" })).toBe(false);
  });

  it("rejects a member row missing `avatarUrl` entirely rather than sending null", () => {
    const { avatarUrl: _avatarUrl, ...noAvatar } = MEMBER;
    expect(moduleMemberContractAccepts(noAvatar)).toBe(false);
  });

  it("keeps the two page envelopes apart, so a swap cannot end pagination silently", () => {
    // `getNextPageParam` reads `lastPage.nextCursor` on the roster and
    // `lastPage.pagination.nextCursor` on the groups route. Serve either shape
    // to the other reader and every list stops after page one, with no error.
    const flat = { data: [MEMBER], hasMore: true, nextCursor: 41 };
    const enveloped = {
      data: [GROUP],
      pagination: { limit: 100, hasMore: true, nextCursor: "abc" },
    };
    expect(moduleRoleGroupPageContract.safeParse(flat).success).toBe(false);
    expect(moduleMemberPageContract.safeParse(enveloped).success).toBe(false);
  });

  it("rejects a roster cursor that became a string, which `typeof === number` drops", () => {
    // `useModuleMembersInfinite` only forwards `pageParam` when it is a number,
    // so a cursor retyped to string would silently replay page one forever.
    expect(
      moduleMemberPageContract.safeParse({
        data: [MEMBER],
        hasMore: true,
        nextCursor: "41",
      }).success,
    ).toBe(false);
  });

  it("rejects a `pagination` block that dropped `hasMore`", () => {
    expect(
      moduleAuditLogPageContract.safeParse({
        data: [AUDIT_ROW],
        pagination: { limit: 25, nextCursor: null },
      }).success,
    ).toBe(false);
  });

  it("rejects an audit row whose actor identity went missing", () => {
    const { actorUserId: _actorUserId, ...noActor } = AUDIT_ROW;
    expect(
      moduleAuditLogPageContract.safeParse({
        data: [noActor],
        pagination: { limit: 25, hasMore: false, nextCursor: null },
      }).success,
    ).toBe(false);
  });

  it("rejects a grant whose `createdAt` arrived as a Date-shaped object", () => {
    expect(
      moduleMemberGrantsContract.safeParse({
        grants: [
          {
            permissionKey: "hr:employees:view",
            scope: "all",
            reason: null,
            createdAt: { seconds: 1756800000 },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects an ownership row that dropped the owner id the screen compares against", () => {
    const { ownerId: _ownerId, ...noOwner } = OWNERSHIP;
    expect(moduleOwnershipContract.safeParse(noOwner).success).toBe(false);
  });

  it("rejects a pending transfer flattened onto the ownership row", () => {
    expect(
      moduleOwnershipContract.safeParse({
        ...OWNERSHIP,
        pendingTransfer: {
          transferId: "b0a1c2d3-0000-4000-8000-000000000000",
          toUserId: "usr_bob",
          toDisplayName: "Bob",
          toEmail: "bob@example.com",
        },
      }).success,
    ).toBe(false);
  });
});
