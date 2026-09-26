import {
  meetingListItemContract,
  meetingListContract,
  meetingPageContract,
  meetingResponseContract,
  meetingDetailContract,
  actionItemRowContract,
  standupEntryContract,
} from "./meetings-schema";

const meetingListItem = {
  id: 1,
  orgId: "org-abc",
  projectId: 10,
  meetingNumber: 5,
  title: "Sprint retrospective",
  type: "retro",
  status: "completed",
  agenda: null,
  notes: null,
  scheduledAt: "2026-09-25T10:00:00Z",
  endAt: "2026-09-25T11:00:00Z",
  durationMinutes: 60,
  timezone: "UTC",
  recurrenceRule: null,
  cycleId: 3,
  createdBy: "user-1",
  createdAt: "2026-09-20T08:00:00Z",
  updatedAt: "2026-09-25T11:05:00Z",
  deletedAt: null,
  attendeeCount: 4,
  actionItemCount: 2,
  unresolvedActionItemCount: 1,
};

const cursorPage = {
  data: [meetingListItem],
  pagination: { limit: 25, hasMore: false, nextCursor: null },
};

const legacyArray = [meetingListItem];

describe("meetingListItemContract", () => {
  it("accepts a valid list item", () => {
    const result = meetingListItemContract.safeParse(meetingListItem);
    expect(result.success).toBe(true);
  });

  it("rejects an item missing attendeeCount", () => {
    const { attendeeCount: _dropped, ...bad } = meetingListItem;
    const result = meetingListItemContract.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe("meetingListContract (legacy array)", () => {
  it("accepts a non-empty array", () => {
    expect(meetingListContract.safeParse(legacyArray).success).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(meetingListContract.safeParse([]).success).toBe(true);
  });

  it("rejects a cursor-page envelope", () => {
    expect(meetingListContract.safeParse(cursorPage).success).toBe(false);
  });
});

describe("meetingPageContract (cursor page)", () => {
  it("accepts a valid cursor page envelope", () => {
    expect(meetingPageContract.safeParse(cursorPage).success).toBe(true);
  });

  it("accepts a page with nextCursor set", () => {
    const withCursor = { ...cursorPage, pagination: { ...cursorPage.pagination, hasMore: true, nextCursor: "abc123" } };
    expect(meetingPageContract.safeParse(withCursor).success).toBe(true);
  });

  it("rejects a plain array", () => {
    expect(meetingPageContract.safeParse(legacyArray).success).toBe(false);
  });

  it("rejects a page missing the pagination key", () => {
    const bad = { data: legacyArray };
    expect(meetingPageContract.safeParse(bad).success).toBe(false);
  });

  it("rejects a page where pagination.hasMore is absent", () => {
    const bad = { data: legacyArray, pagination: { limit: 25, nextCursor: null } };
    expect(meetingPageContract.safeParse(bad).success).toBe(false);
  });
});

describe("meetingResponseContract (rollout union)", () => {
  it("accepts a cursor-page envelope during rollout — does NOT produce CONTRACT_VIOLATION", () => {
    const result = meetingResponseContract.safeParse(cursorPage);
    expect(result.success).toBe(true);
  });

  it("accepts a legacy array during rollout", () => {
    const result = meetingResponseContract.safeParse(legacyArray);
    expect(result.success).toBe(true);
  });

  it("rejects a drifted shape where pagination is missing", () => {
    const bad = { data: legacyArray };
    const result = meetingResponseContract.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("select normalizer: cursor page extracts .data", () => {
    const raw = meetingResponseContract.parse(cursorPage);
    const normalized = Array.isArray(raw) ? raw : raw.data;
    expect(normalized).toEqual([meetingListItem]);
  });

  it("select normalizer: legacy array passes through", () => {
    const raw = meetingResponseContract.parse(legacyArray);
    const normalized = Array.isArray(raw) ? raw : raw.data;
    expect(normalized).toEqual(legacyArray);
  });
});

describe("meetingDetailContract", () => {
  const detail = {
    ...meetingListItem,
    attendees: [
      {
        id: 1,
        orgId: "org-abc",
        meetingId: 1,
        membershipId: 10,
        userId: "user-1",
        attended: true,
        createdAt: "2026-09-25T10:00:00Z",
      },
    ],
    actionItems: [],
    standupEntries: [],
  };

  it("accepts a valid detail record", () => {
    expect(meetingDetailContract.safeParse(detail).success).toBe(true);
  });

  it("rejects a detail record missing attendees", () => {
    const { attendees: _dropped, ...bad } = detail;
    expect(meetingDetailContract.safeParse(bad).success).toBe(false);
  });
});

describe("actionItemRowContract", () => {
  const item = {
    id: 1,
    orgId: "org-abc",
    meetingId: 1,
    projectId: 10,
    title: "Follow up with stakeholder",
    description: null,
    assigneeId: "user-2",
    dueDate: "2026-10-01",
    status: "open",
    convertedTicketId: null,
    createdBy: "user-1",
    createdAt: "2026-09-25T11:00:00Z",
    updatedAt: "2026-09-25T11:00:00Z",
    deletedAt: null,
  };

  it("accepts a valid action item", () => {
    expect(actionItemRowContract.safeParse(item).success).toBe(true);
  });

  it("rejects an action item missing status", () => {
    const { status: _dropped, ...bad } = item;
    expect(actionItemRowContract.safeParse(bad).success).toBe(false);
  });
});

describe("standupEntryContract", () => {
  const entry = {
    id: 1,
    orgId: "org-abc",
    meetingId: 1,
    userId: "user-1",
    membershipId: null,
    yesterday: "Reviewed PRs",
    today: "Write tests",
    blockers: null,
    createdAt: "2026-09-25T10:00:00Z",
    updatedAt: "2026-09-25T10:00:00Z",
  };

  it("accepts a valid standup entry", () => {
    expect(standupEntryContract.safeParse(entry).success).toBe(true);
  });

  it("rejects an entry missing userId", () => {
    const { userId: _dropped, ...bad } = entry;
    expect(standupEntryContract.safeParse(bad).success).toBe(false);
  });
});
