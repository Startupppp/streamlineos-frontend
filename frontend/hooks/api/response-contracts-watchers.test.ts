import {
  buildTicketWatcherContract,
  buildTicketWatchersContract,
  supportTicketWatcherContract,
  supportTicketWatchersContract,
} from "@/hooks/api/watchers-schema";

/**
 * Both watcher lists shipped the same defect, and in both the consequence was
 * that UN-following became unreachable: `isFollowing` / `isWatching` is an
 * equality test on `userId`, `userId` was `undefined` on every row, so the
 * component could only ever take the follow branch. `follow` uses
 * `onConflictDoNothing`, so every repeat click returned success and changed
 * nothing.
 *
 * The ACCEPTS half is the payload the services build today; the BITE half is the
 * payload that shipped.
 */

const SUPPORT_WATCHER = {
  id: 5,
  orgId: "org_1",
  ticketId: 88,
  createdAt: "2026-09-01T10:00:00.000Z",
  userId: "usr_alice",
  user: { id: "usr_alice", name: "Alice", image: null },
};

const BUILD_WATCHER = {
  id: 12,
  ticketId: 400,
  createdAt: "2026-09-01T10:00:00.000Z",
  userId: "usr_alice",
  user: {
    id: "usr_alice",
    name: "Alice",
    firstName: "Alice",
    lastName: "Ng",
    image: null,
    email: "alice@example.com",
  },
};

describe("the watcher contracts accept what the services actually build", () => {
  it("accepts a support watcher and a list of them", () => {
    expect(supportTicketWatcherContract.safeParse(SUPPORT_WATCHER).success).toBe(true);
    expect(supportTicketWatchersContract.safeParse([SUPPORT_WATCHER]).success).toBe(true);
    expect(supportTicketWatchersContract.safeParse([]).success).toBe(true);
  });

  it("accepts a build watcher and a list of them", () => {
    expect(buildTicketWatcherContract.safeParse(BUILD_WATCHER).success).toBe(true);
    expect(buildTicketWatchersContract.safeParse([BUILD_WATCHER]).success).toBe(true);
  });

  it("accepts a watcher whose organization row is gone, as nulls", () => {
    expect(
      supportTicketWatcherContract.safeParse({ ...SUPPORT_WATCHER, userId: null, user: null })
        .success,
    ).toBe(true);
  });

  it("keeps the two watcher rows apart — support carries orgId, build does not", () => {
    expect(supportTicketWatcherContract.safeParse(BUILD_WATCHER).success).toBe(false);
    expect(buildTicketWatcherContract.safeParse(SUPPORT_WATCHER).success).toBe(false);
  });
});

describe("BITE — the watcher payloads that actually shipped are rejected", () => {
  /**
   * Support: the row shipped `userMembershipId` and a `membership` join, with no
   * `user` columns selected at all. `isFollowing` was permanently false, the star
   * never filled, and `DELETE /support/:id/follow` was unreachable from the UI.
   */
  it("rejects the support row with the identity left under membership", () => {
    const shipped = {
      id: 5,
      orgId: "org_1",
      ticketId: 88,
      userMembershipId: 41,
      createdAt: "2026-09-01T10:00:00.000Z",
      membership: { id: 41, userId: "usr_alice" },
    };
    const result = supportTicketWatcherContract.safeParse(shipped);
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["userId", "user"]));
  });

  /**
   * Build: the `ticket_watchers.user` relation points at `organization_members`,
   * so `w.user` was a MEMBERSHIP row — no name, no email, no image. Every avatar
   * fell back to "?" and `key={w.userId}` was `undefined` on every row, which is
   * also a duplicate-React-key bug.
   */
  it("rejects the build row whose user is really an organization_members row", () => {
    const shipped = {
      id: 12,
      ticketId: 400,
      createdAt: "2026-09-01T10:00:00.000Z",
      user: { id: 41, orgId: "org_1", userId: "usr_alice", role: "MEMBER", isOwner: false },
    };
    expect(buildTicketWatcherContract.safeParse(shipped).success).toBe(false);
  });

  it("rejects a watcher whose userId was dropped rather than nulled", () => {
    const { userId: _userId, ...withoutId } = SUPPORT_WATCHER;
    expect(supportTicketWatcherContract.safeParse(withoutId).success).toBe(false);
  });

  it("rejects a build user missing the name fields the avatar renders", () => {
    const thin = { ...BUILD_WATCHER, user: { id: "usr_alice", name: "Alice", image: null } };
    expect(buildTicketWatcherContract.safeParse(thin).success).toBe(false);
  });
});
