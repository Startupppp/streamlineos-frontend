import {
  buildMemberPageContract,
  buildMemberRowContract,
} from "./build-project-schema";

const validMember = {
  id: "user-abc",
  role: "member" as const,
  addedAt: "2024-01-01T00:00:00.000Z",
  name: "Alice Smith",
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  image: null,
  teams: [],
};

const validPage = {
  data: [validMember],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
};

describe("buildMemberPageContract (BLD-X-BE-SETTINGS-ACCESS-001)", () => {
  it("accepts a valid paginated member page", () => {
    expect(() => buildMemberPageContract.parse(validPage)).not.toThrow();
  });

  it("accepts null nextCursor — cursor is null when there are no more pages", () => {
    const result = buildMemberPageContract.parse(validPage);
    expect(result.pagination.nextCursor).toBeNull();
  });

  it("accepts a string nextCursor — cursor semantics enforce keyset pagination contract", () => {
    const withCursor = { ...validPage, pagination: { limit: 50, hasMore: true, nextCursor: "cursor-abc" } };
    const result = buildMemberPageContract.parse(withCursor);
    expect(result.pagination.nextCursor).toBe("cursor-abc");
  });

  it("rejects a page missing pagination envelope — envelope is required", () => {
    expect(() => buildMemberPageContract.parse({ data: [validMember] })).toThrow();
  });

  it("accepts null name — members may not have a display name set", () => {
    const withNullName = { ...validPage, data: [{ ...validMember, name: null, firstName: null, lastName: null }] };
    expect(() => buildMemberPageContract.parse(withNullName)).not.toThrow();
  });

  it("rejects an unknown role — z.enum(['member','admin']) prevents non-member values from passing", () => {
    const withUnknownRole = { ...validPage, data: [{ ...validMember, role: "owner" }] };
    expect(() => buildMemberPageContract.parse(withUnknownRole)).toThrow();
  });

  it("accepts both valid role values — member and admin are the only allowed project roles", () => {
    for (const role of ["member", "admin"] as const) {
      const result = buildMemberPageContract.safeParse({ ...validPage, data: [{ ...validMember, role }] });
      expect(result.success).toBe(true);
    }
  });

  it("accepts null image — member may not have uploaded a profile photo", () => {
    const withNullImage = { ...validPage, data: [{ ...validMember, image: null }] };
    expect(() => buildMemberPageContract.parse(withNullImage)).not.toThrow();
  });

  it("accepts a non-empty teams array", () => {
    const withTeams = { ...validPage, data: [{ ...validMember, teams: ["team-a", "team-b"] }] };
    expect(() => buildMemberPageContract.parse(withTeams)).not.toThrow();
  });
});

describe("buildMemberRowContract (BLD-X-BE-SETTINGS-ACCESS-002)", () => {
  const validRow = {
    id: 1,
    orgId: "org-abc",
    membershipId: 5,
    role: "member",
    addedAt: "2024-01-01T00:00:00.000Z",
  };

  it("accepts a valid member row", () => {
    expect(() => buildMemberRowContract.parse(validRow)).not.toThrow();
  });

  it("rejects a row missing membershipId", () => {
    const { membershipId: _m, ...withoutMembership } = validRow;
    expect(() => buildMemberRowContract.parse(withoutMembership)).toThrow();
  });
});

describe("project members cache key contract (BLD-X-BE-SETTINGS-ACCESS-003)", () => {
  it("includes projectId in the members cache key — correct scope prevents cross-project member list leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.members(10);
    expect(key).toContain(10);
  });

  it("includes 'members' segment in the cache key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.members(10);
    expect(key.some((s: unknown) => s === "members")).toBe(true);
  });

  it("two different projectIds produce different member cache keys — cross-project cache collision is impossible", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.members(1);
    const key2 = buildWorkQueryKeys.projects.members(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("org-scope members key omits projectId — global member list is project-independent", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const orgKey = buildWorkQueryKeys.projects.members();
    expect(orgKey.some((s: unknown) => typeof s === "number")).toBe(false);
  });
});

describe("build org-level members cache key contract (BLD-X-BE-SETTINGS-BGMEM-001)", () => {
  it("includes 'buildMembers' segment in the org-level member cache key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.buildMembers.all;
    expect(key.some((s: unknown) => s === "buildMembers")).toBe(true);
  });

  it("list key with no params produces a stable base key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.buildMembers.list();
    expect(key.some((s: unknown) => s === "buildMembers")).toBe(true);
  });

  it("list key with params is longer than list key without params — filters do not collapse to the same key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const base = buildWorkQueryKeys.projects.buildMembers.list();
    const withParams = buildWorkQueryKeys.projects.buildMembers.list({ search: "Alice" });
    expect(withParams.length).toBeGreaterThan(base.length);
  });

  it("all-key is a prefix of the list key — invalidating all invalidates every list variant", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const allKey = buildWorkQueryKeys.projects.buildMembers.all;
    const listKey = buildWorkQueryKeys.projects.buildMembers.list();
    const allStr = JSON.stringify(allKey);
    const listStr = JSON.stringify(listKey);
    expect(listStr.startsWith(allStr.slice(0, -1))).toBe(true);
  });
});
