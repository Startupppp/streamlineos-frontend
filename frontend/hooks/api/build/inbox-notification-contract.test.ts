import { ZodError } from "zod";
import { notificationListContract } from "@/hooks/api/notifications-schema";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const baseRow = {
  id: 12,
  orgId: "org-a",
  userId: "user-a",
  type: "INFO",
  priority: "NORMAL",
  category: "PROJECTS",
  sourceModule: "build",
  eventKey: "build.ticket.assigned",
  entityType: "ticket",
  entityId: "41",
  reason: null,
  title: "BLD-41 was assigned to you",
  message: "You have been assigned to BLD-41",
  link: "/build/1/tickets/41",
  isRead: false,
  pinned: false,
  channel: "IN_APP",
  metadata: null,
  archivedAt: null,
  snoozedUntil: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  ticketContext: {
    ticketId: 41,
    ticketKey: "BLD-41",
    priority: "HIGH",
    status: "IN_PROGRESS",
    type: "BUG",
    assignee: {
      id: "user-a",
      name: "Aditya C",
      firstName: "Aditya",
      lastName: "C",
      image: null,
    },
  },
};

describe("notificationListContract — inbox envelope shape", () => {
  it("uses a FLAT envelope (data, hasMore, nextCursor) not the opaque-cursor pagination object, so getNextPageParam reads nextCursor directly", () => {
    const page = { data: [baseRow], hasMore: true, nextCursor: 11 };
    const parsed = notificationListContract.parse(page);
    expect(parsed.hasMore).toBe(true);
    expect(parsed.nextCursor).toBe(11);
    expect(Object.keys(parsed)).not.toContain("pagination");
  });

  it("accepts null nextCursor on the terminal page so the caller can detect end-of-list without a separate flag", () => {
    const page = { data: [baseRow], hasMore: false, nextCursor: null };
    const parsed = notificationListContract.parse(page);
    expect(parsed.nextCursor).toBeNull();
    expect(parsed.hasMore).toBe(false);
  });

  it("accepts a numeric nextCursor, not a string, because the inbox is ordered by integer id and a string cursor would silently break id < cursor continuation", () => {
    const page = { data: [baseRow], hasMore: true, nextCursor: 7 };
    const parsed = notificationListContract.parse(page);
    expect(typeof parsed.nextCursor).toBe("number");
  });

  it("rejects a string nextCursor so the wrong cursor type fails here rather than silently ending pagination at page one", () => {
    expect(() =>
      notificationListContract.parse({ data: [baseRow], hasMore: true, nextCursor: "opaque" }),
    ).toThrow(ZodError);
  });

  it("rejects an envelope that wraps pagination under a nested key, which would be the wrong shape for teams/approvals opaque cursors", () => {
    const teamsShape = {
      data: [baseRow],
      pagination: { limit: 25, hasMore: true, nextCursor: "abc" },
    };
    expect(() => notificationListContract.parse(teamsShape)).toThrow(ZodError);
  });
});

describe("notificationListContract — inbox item required fields", () => {
  it("accepts a row with all core display fields so the inbox row renders title, type, category, priority, and link", () => {
    const page = { data: [baseRow], hasMore: false, nextCursor: null };
    const parsed = notificationListContract.parse(page);
    const item = parsed.data[0];
    expect(item?.title).toBe(baseRow.title);
    expect(item?.type).toBe("INFO");
    expect(item?.priority).toBe("NORMAL");
    expect(item?.category).toBe("PROJECTS");
    expect(item?.link).toBe(baseRow.link);
  });

  it("accepts nullable message, link, archivedAt and snoozedUntil so archive and snooze states do not require the field to be set", () => {
    const row = { ...baseRow, message: null, link: null, archivedAt: null, snoozedUntil: null };
    const parsed = notificationListContract.parse({ data: [row], hasMore: false, nextCursor: null });
    const item = parsed.data[0];
    expect(item?.message).toBeNull();
    expect(item?.link).toBeNull();
    expect(item?.archivedAt).toBeNull();
    expect(item?.snoozedUntil).toBeNull();
  });

  it("rejects a row missing the required title field so a backend regression that drops the title fails here, not as a blank inbox row", () => {
    const { title: _omit, ...withoutTitle } = baseRow;
    expect(() =>
      notificationListContract.parse({ data: [withoutTitle], hasMore: false, nextCursor: null }),
    ).toThrow(ZodError);
  });
});

describe("platformCoreQueryKeys.notifications — inbox cache key isolation", () => {
  it("a filtered list key contains the params object so different inbox filter combinations occupy separate cache slots", () => {
    const unread = platformCoreQueryKeys.notifications.list({ isRead: false });
    const archived = platformCoreQueryKeys.notifications.list({ archivedAt: "not-null" });
    const bare = platformCoreQueryKeys.notifications.list();
    expect(unread).not.toEqual(archived);
    expect(unread).not.toEqual(bare);
    expect(archived).not.toEqual(bare);
  });

  it("the bare list key is a prefix of every filtered key so invalidateQueries on the bare key flushes all inbox pages on a bulk-read", () => {
    const bare = platformCoreQueryKeys.notifications.list();
    const filtered = platformCoreQueryKeys.notifications.list({ category: "PROJECTS" });
    expect(filtered.slice(0, bare.length)).toEqual(bare);
  });
});
