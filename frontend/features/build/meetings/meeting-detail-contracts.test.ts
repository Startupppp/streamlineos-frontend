/**
 * @jest-environment node
 *
 * Contract tests for the meeting-detail wire seam.
 *
 * `meetingDetailContract` is the Zod schema the `useMeeting` hook validates
 * the GET /build/:projectId/meetings/:meetingId response against via
 * `meetingDetailContract` (lazyContract). A cast (`res.json() as MeetingDetail`)
 * would silently accept a drifted response — embedded arrays becoming undefined,
 * renamed fields surfacing as undefined — so we verify the schema rejects drift
 * rather than swallowing it.
 *
 * Cache-key tests prove that `buildWorkQueryKeys.projects.meetings.detail`
 * produces keys that are:
 *   - scoped to the meetingId (two different meetingIds → two different keys)
 *   - scoped to the projectId (two different projectIds → two different keys)
 *   - stable enough to invalidate exactly the affected record
 */

import { meetingDetailContract } from "@/hooks/api/build/meetings-schema";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const BASE_MEETING_DETAIL = {
  id: 100,
  orgId: "org-1",
  projectId: 42,
  meetingNumber: 7,
  title: "Sprint planning",
  type: "planning",
  status: "scheduled",
  agenda: "1. Review backlog\n2. Assign tasks",
  notes: null,
  scheduledAt: "2026-10-01T10:00:00Z",
  endAt: "2026-10-01T11:00:00Z",
  durationMinutes: 60,
  timezone: "UTC",
  recurrenceRule: null,
  cycleId: null,
  createdBy: "user-xyz",
  createdAt: "2026-09-01T09:00:00Z",
  updatedAt: "2026-09-25T10:00:00Z",
  deletedAt: null,
  attendees: [
    {
      id: 1,
      orgId: "org-1",
      meetingId: 100,
      membershipId: 55,
      userId: "user-xyz",
      attended: false,
      createdAt: "2026-09-01T09:00:00Z",
    },
  ],
  actionItems: [
    {
      id: 10,
      orgId: "org-1",
      meetingId: 100,
      projectId: 42,
      title: "Update the readme",
      description: null,
      assigneeId: "user-xyz",
      dueDate: "2026-10-08T00:00:00Z",
      status: "open",
      convertedTicketId: null,
      createdBy: "user-xyz",
      createdAt: "2026-09-01T09:00:00Z",
      updatedAt: "2026-09-25T10:00:00Z",
      deletedAt: null,
    },
  ],
  standupEntries: [
    {
      id: 5,
      orgId: "org-1",
      meetingId: 100,
      userId: "user-xyz",
      membershipId: 55,
      yesterday: "Finished the refactor",
      today: "Writing tests",
      blockers: null,
      createdAt: "2026-09-01T09:00:00Z",
      updatedAt: "2026-09-25T10:00:00Z",
    },
  ],
};

describe("meetingDetailContract — wire shape acceptance", () => {
  it("accepts a complete meeting-detail wire sample", () => {
    const result = meetingDetailContract.safeParse(BASE_MEETING_DETAIL);
    expect(result.success).toBe(true);
  });

  it("accepts a meeting with empty embedded arrays", () => {
    const result = meetingDetailContract.safeParse({
      ...BASE_MEETING_DETAIL,
      attendees: [],
      actionItems: [],
      standupEntries: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields as null", () => {
    const result = meetingDetailContract.safeParse({
      ...BASE_MEETING_DETAIL,
      agenda: null,
      scheduledAt: null,
      endAt: null,
      durationMinutes: null,
      timezone: null,
      cycleId: null,
      createdBy: null,
      deletedAt: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("meetingDetailContract — drift rejection", () => {
  it("rejects when attendees is absent — embedded relation must be present", () => {
    const { attendees: _dropped, ...rest } = BASE_MEETING_DETAIL;
    const result = meetingDetailContract.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when actionItems is absent", () => {
    const { actionItems: _dropped, ...rest } = BASE_MEETING_DETAIL;
    const result = meetingDetailContract.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when standupEntries is absent", () => {
    const { standupEntries: _dropped, ...rest } = BASE_MEETING_DETAIL;
    const result = meetingDetailContract.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when a required top-level field is renamed — drift that typechecks silently", () => {
    const { title: _dropped, ...rest } = BASE_MEETING_DETAIL;
    const result = meetingDetailContract.safeParse({ ...rest, name: "Sprint planning" });
    expect(result.success).toBe(false);
  });

  it("rejects when an action item misses its status field", () => {
    const result = meetingDetailContract.safeParse({
      ...BASE_MEETING_DETAIL,
      actionItems: [{ ...BASE_MEETING_DETAIL.actionItems[0], status: undefined }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when an attendee misses the attended boolean", () => {
    const { attended: _dropped, ...attendeeNoAttended } =
      BASE_MEETING_DETAIL.attendees[0]!;
    const result = meetingDetailContract.safeParse({
      ...BASE_MEETING_DETAIL,
      attendees: [attendeeNoAttended],
    });
    expect(result.success).toBe(false);
  });
});

describe("meeting detail cache key — scoping invariants", () => {
  it("two different meetingIds produce distinct keys — exact-record invalidation is possible", () => {
    const keyA = buildWorkQueryKeys.projects.meetings.detail(42, 100);
    const keyB = buildWorkQueryKeys.projects.meetings.detail(42, 101);
    expect(keyA).not.toEqual(keyB);
  });

  it("two different projectIds produce distinct keys — cross-project cache isolation", () => {
    const keyA = buildWorkQueryKeys.projects.meetings.detail(1, 100);
    const keyB = buildWorkQueryKeys.projects.meetings.detail(2, 100);
    expect(keyA).not.toEqual(keyB);
  });

  it("the meetingId appears in the key so invalidation targets the correct record", () => {
    const meetingId = 9999;
    const key = buildWorkQueryKeys.projects.meetings.detail(42, meetingId);
    expect(JSON.stringify(key)).toContain(String(meetingId));
  });

  it("the projectId appears in the key so invalidation stays within the project scope", () => {
    const projectId = 7777;
    const key = buildWorkQueryKeys.projects.meetings.detail(projectId, 100);
    expect(JSON.stringify(key)).toContain(String(projectId));
  });

  it("the detail key is a prefix-ancestor of the meetings.all key — prefix-invalidation reaches it", () => {
    const allKey = buildWorkQueryKeys.projects.meetings.all(42);
    const detailKey = buildWorkQueryKeys.projects.meetings.detail(42, 100);
    const allStr = JSON.stringify(allKey);
    const detailStr = JSON.stringify(detailKey);
    expect(detailStr.startsWith(allStr.slice(0, -1))).toBe(true);
  });
});
