import {
  usersResponseContract,
  userMembershipContract,
} from "@/hooks/api/users/extended-users-schema";

const KEYSET = { limit: 25, hasMore: false, nextCursor: null };

const baseUserListItem = {
  membershipId: 1,
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  firstName: "Test",
  lastName: "User",
  image: null,
  role: "MEMBER",
  isOwner: false,
  phone: null,
  createdAt: "2026-09-14T10:00:00.000Z",
  joinedAt: "2026-09-14T10:00:00.000Z",
  lastSeenAt: null,
  teams: [],
  isActive: true,
  userStatus: "active",
  archivedAt: null,
};

describe("users list contract — emailVerified boolean projection", () => {
  it("accepts emailVerified: false — null timestamp projected to boolean by the fixed backend", () => {
    expect(
      usersResponseContract.safeParse({ data: [{ ...baseUserListItem, emailVerified: false }], pagination: KEYSET }).success,
    ).toBe(true);
  });

  it("accepts emailVerified: true — non-null timestamp projected to boolean by the fixed backend", () => {
    expect(
      usersResponseContract.safeParse({ data: [{ ...baseUserListItem, emailVerified: true }], pagination: KEYSET }).success,
    ).toBe(true);
  });

  it("rejects emailVerified as an ISO string — what the pre-fix backend actually sent, causing ApiContractError", () => {
    const result = usersResponseContract.safeParse({
      data: [{ ...baseUserListItem, emailVerified: "2026-09-14T10:00:00.000Z" }],
      pagination: KEYSET,
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths.some((p) => p.includes("emailVerified"))).toBe(true);
  });

  it("accepts emailVerified: null — allowed by nullable(), though the fixed backend never emits null", () => {
    expect(
      usersResponseContract.safeParse({ data: [{ ...baseUserListItem, emailVerified: null }], pagination: KEYSET }).success,
    ).toBe(true);
  });
});

describe("user membership contract — matches getMembership wire shape", () => {
  const membershipPayload = {
    userId: "user-1",
    orgId: "org-1",
    businessUnitId: null,
    branchId: null,
    departmentId: null,
    teamId: null,
    managerUserId: null,
  };

  it("accepts the live API shape without isPrimary", () => {
    expect(userMembershipContract.safeParse(membershipPayload).success).toBe(true);
  });

  it("still accepts an isPrimary field if a future deploy adds it (non-strict)", () => {
    expect(
      userMembershipContract.safeParse({ ...membershipPayload, isPrimary: true }).success,
    ).toBe(true);
  });
});
