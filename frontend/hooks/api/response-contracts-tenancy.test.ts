import {
  orgMemberContract,
  orgMembersPageContract,
  switchOrgResultContract,
  userOrganizationsContract,
} from "@/hooks/api/organization-schema";
import {
  roleContract,
  roleListItemContract,
  rolesPageContract,
  simulatedAccessContract,
  simulationCandidatesPageContract,
} from "@/hooks/api/roles-schema";
import {
  orgModuleStatusesContract,
  userModuleAccessListContract,
} from "@/hooks/api/access/module-status-schema";
import { workersPageContract } from "@/hooks/api/directory/workers-schema";
import { userStatsContract } from "@/hooks/api/users/users-schema";
import { coaTreeContract, setupStatusContract } from "@/hooks/api/accounting/core-coa-schema";

const MEMBER = {
  membershipId: 9,
  userId: "user-1",
  role: "MEMBER",
  joinedAt: "2026-01-02T10:00:00.000Z",
  name: "Ada",
  email: "ada@example.com",
  image: null,
  totpEnabled: false,
};

const KEYSET = { limit: 20, hasMore: true, nextCursor: "eyJpZCI6OX0" };

const ROLE = {
  id: 3,
  name: "Accountant",
  slug: "ACCOUNTANT",
  rank: 40,
  orgId: "org-1",
  version: 1,
  isSystem: true,
  moduleKey: "accounting",
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  description: null,
};

describe("organization membership — the page shape that was never sent", () => {
  it("accepts the keyset page the server actually builds", () => {
    expect(orgMembersPageContract.safeParse({ data: [MEMBER], pagination: KEYSET }).success).toBe(true);
  });

  it("REJECTS the offset page the client type declared for years", () => {
    const offset = {
      data: [MEMBER],
      pagination: { page: 1, limit: 20, total: 54, totalPages: 3 },
    };
    const result = orgMembersPageContract.safeParse(offset);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(paths).toContain("pagination.hasMore");
    expect(paths).toContain("pagination.nextCursor");
  });

  it("accepts a last page, whose nextCursor is null rather than absent", () => {
    const page = { data: [MEMBER], pagination: { limit: 20, hasMore: false, nextCursor: null } };
    expect(orgMembersPageContract.safeParse(page).success).toBe(true);
  });

  it("rejects a page whose nextCursor key went missing entirely", () => {
    const page = { data: [MEMBER], pagination: { limit: 20, hasMore: false } };
    expect(orgMembersPageContract.safeParse(page).success).toBe(false);
  });

  it("rejects joinedAt as anything but a string — it was typed Date", () => {
    const result = orgMemberContract.safeParse({ ...MEMBER, joinedAt: 1767225600000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("joinedAt");
  });

  it("rejects a membershipId that arrived as a uuid string", () => {
    expect(orgMemberContract.safeParse({ ...MEMBER, membershipId: "9" }).success).toBe(false);
  });

  it("accepts a member with no display name", () => {
    expect(orgMemberContract.safeParse({ ...MEMBER, name: null }).success).toBe(true);
  });
});

describe("tenancy", () => {
  it("accepts an org list whose joinedAt came from the nullable index column", () => {
    const orgs = [{ id: "org-1", name: "Acme", slug: "acme", role: "OWNER", joinedAt: null }];
    expect(userOrganizationsContract.safeParse(orgs).success).toBe(true);
  });

  it("rejects a switch result keyed on `id` instead of `orgId`", () => {
    const body = { id: "org-2", name: "Beta", slug: "beta", role: "MEMBER" };
    expect(switchOrgResultContract.safeParse(body).success).toBe(false);
  });

  it("rejects a switch result that leaked outgoingOrgId back in as the only id", () => {
    const body = { outgoingOrgId: "org-1", name: "Beta", slug: "beta", role: "MEMBER" };
    expect(switchOrgResultContract.safeParse(body).success).toBe(false);
  });
});

describe("roles", () => {
  it("accepts a list row and a detail row, which are different shapes", () => {
    expect(rolesPageContract.safeParse({
      data: [{ ...ROLE, permissionCount: 12, memberCount: 4 }],
      pagination: KEYSET,
    }).success).toBe(true);
    expect(roleContract.safeParse(ROLE).success).toBe(true);
  });

  it("rejects a memberCount that arrived as the string a raw COUNT returns", () => {
    const result = roleListItemContract.safeParse({ ...ROLE, permissionCount: 12, memberCount: "4" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("memberCount");
  });

  it("rejects a list row that lost its computed counts", () => {
    expect(roleListItemContract.safeParse(ROLE).success).toBe(false);
  });

  it("accepts a tenant-created role with no module and no description", () => {
    expect(roleContract.safeParse({ ...ROLE, moduleKey: null, description: null, isSystem: false }).success).toBe(true);
  });
});

describe("access simulation", () => {
  const SIMULATION = {
    userId: "user-2",
    permissions: ["crm:contacts:view", "hr:employees:view"],
    scopes: { "crm:contacts:view": "all", "hr:employees:view": "own" },
    isOrgOwner: false,
    standing: "MEMBER",
    provenance: [
      {
        permissionKey: "crm:contacts:view",
        moduleKey: "crm",
        scope: "all",
        expiresAt: null,
        sources: [
          { kind: "role-grant", label: "Sales", scope: "all", moduleKey: "crm", expiresAt: null },
        ],
      },
    ],
    moduleStandings: [
      { moduleKey: "crm", standing: "member", available: true, permissionCount: 1 },
    ],
  };

  it("accepts a simulation whose scopes are the three the route can emit", () => {
    expect(simulatedAccessContract.safeParse(SIMULATION).success).toBe(true);
  });

  it("rejects a scope of \"none\", which the route filters out before responding", () => {
    const body = {
      ...SIMULATION,
      permissions: ["crm:contacts:view"],
      scopes: { "crm:contacts:view": "none" },
    };
    expect(simulatedAccessContract.safeParse(body).success).toBe(false);
  });

  it("accepts a candidate with no HR employment row, hence a null designation", () => {
    const page = {
      data: [{ id: "user-2", name: null, email: "b@c.co", image: null, designation: null }],
      pagination: KEYSET,
    };
    expect(simulationCandidatesPageContract.safeParse(page).success).toBe(true);
  });
});

describe("module access — two routes that look identical and are not", () => {
  it("accepts org modules where `core` is absent for a plan-gated module", () => {
    const body = [{ moduleKey: "hr", enabled: true }, { moduleKey: "kb", enabled: true, core: true }];
    expect(orgModuleStatusesContract.safeParse(body).success).toBe(true);
  });

  it("rejects org modules that spelled a non-core module `core: false`", () => {
    const body = [{ moduleKey: "hr", enabled: true, core: false }];
    expect(orgModuleStatusesContract.safeParse(body).success).toBe(false);
  });

  it("requires `core` on the per-user route, where it is always a real boolean", () => {
    expect(userModuleAccessListContract.safeParse([{ moduleKey: "hr", enabled: true }]).success).toBe(false);
    expect(userModuleAccessListContract.safeParse([{ moduleKey: "hr", enabled: true, core: false }]).success).toBe(true);
  });
});

describe("PII", () => {
  const WORKER = {
    workerId: "11111111-1111-1111-1111-111111111111",
    organizationId: "org-1",
    organizationPersonId: "22222222-2222-2222-2222-222222222222",
    workerNumber: "W-001",
    status: "ACTIVE",
    isPayee: true,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    firstName: "Ada",
    lastName: "Lovelace",
    displayName: null,
    workEmail: null,
    avatarUrl: null,
    userId: null,
  };

  it("accepts the hand-rolled pageInfo envelope this route uses", () => {
    expect(workersPageContract.safeParse({ data: [WORKER], pageInfo: KEYSET }).success).toBe(true);
  });

  it("rejects the shared `pagination` envelope — this route does not use it", () => {
    expect(workersPageContract.safeParse({ data: [WORKER], pagination: KEYSET }).success).toBe(false);
  });

  it("rejects a worker status outside the three the column allows", () => {
    expect(workersPageContract.safeParse({ data: [{ ...WORKER, status: "TERMINATED" }], pageInfo: KEYSET }).success).toBe(false);
  });

  it("rejects a required PII name that arrived null", () => {
    const result = workersPageContract.safeParse({ data: [{ ...WORKER, firstName: null }], pageInfo: KEYSET });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path.join(".")).toBe("data.0.firstName");
  });

  it("rejects a user counter that arrived as a string", () => {
    const stats = { total: "42", active: 40, suspended: 1, archived: 1, pendingInvitations: 0, newThisMonth: 3 };
    expect(userStatsContract.safeParse(stats).success).toBe(false);
  });

  it("rejects a stats body that dropped newThisMonth", () => {
    const stats = { total: 42, active: 40, suspended: 1, archived: 1, pendingInvitations: 0 };
    expect(userStatsContract.safeParse(stats).success).toBe(false);
  });
});

describe("chart of accounts and setup", () => {
  it("validates the recursive tree to its leaves", () => {
    const node = (id: number, children: unknown[]) => ({
      id, code: `10${id}`, name: `Account ${id}`, accountType: "ASSET",
      normalBalance: "DEBIT", isSystem: true, isActive: true, description: null,
      parentAccountId: null, hasActivity: false, children,
    });
    expect(coaTreeContract.safeParse({ items: [node(1, [node(2, [node(3, [])])])] }).success).toBe(true);
  });

  it("rejects a tree whose grandchild lost hasActivity", () => {
    const bad = {
      items: [{
        id: 1, code: "1010", name: "Cash", accountType: "ASSET", normalBalance: "DEBIT",
        isSystem: true, isActive: true, description: null, parentAccountId: null,
        hasActivity: false,
        children: [{
          id: 2, code: "1011", name: "Petty cash", accountType: "ASSET", normalBalance: "DEBIT",
          isSystem: false, isActive: true, description: null, parentAccountId: 1, children: [],
        }],
      }],
    };
    const result = coaTreeContract.safeParse(bad);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.join(".").endsWith("hasActivity"))).toBe(true);
  });

  it("rejects a setup checklist that lost its done flags", () => {
    expect(setupStatusContract.safeParse({ steps: [{ key: "coa", label: "Set up chart of accounts" }] }).success).toBe(false);
  });

  it("BITE: an accountType outside the pg enum is rejected — a mis-filed posting, not a mis-drawn badge", () => {
    const bad = {
      items: [{
        id: 1, code: "1010", name: "Cash", accountType: "ASSETS", normalBalance: "DEBIT",
        isSystem: true, isActive: true, description: null, parentAccountId: null,
        hasActivity: false, children: [],
      }],
    };
    const result = coaTreeContract.safeParse(bad);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.join(".").endsWith("accountType"))).toBe(true);
  });
});
