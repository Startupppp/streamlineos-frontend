import { ticketDetailContract } from "@/hooks/api/build/build-tickets-schema";

const TICKET_ROW = {
  id: 7,
  orgId: "org-1",
  title: "Fix the thing",
  description: null,
  type: "TASK",
  status: "TODO",
  priority: "MEDIUM",
  projectId: 3,
  ticketNumber: 42,
  sprintId: null,
  epicId: null,
  assigneeMembershipId: null,
  reporterId: "user-1",
  reporterMembershipId: null,
  points: null,
  storyPoints: null,
  link: null,
  rank: "a0",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: "0",
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  sequenceId: null,
  estimate: null,
  completionPercentage: 0,
  clientVisible: false,
  isRecurring: false,
  recurrenceRule: null,
  recurrenceParentId: null,
  recurrenceNextRunAt: null,
  customerId: null,
  version: 1,
  deletedAt: null,
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
};

const AUTHOR = {
  id: "user-1",
  name: "Asha Rao",
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.com",
  image: null,
};

function detailPayload(comments: unknown[]) {
  return {
    ...TICKET_ROW,
    project: { id: 3, name: "Core", key: "CORE", orgId: "org-1" },
    epic: null,
    assignee: null,
    reporter: AUTHOR,
    assignees: [],
    watchers: [],
    attachments: [],
    labels: [],
    comments,
  };
}

const COMMENT = {
  id: 501,
  orgId: "org-1",
  ticketId: 7,
  userId: "user-1",
  content: "<p>Looks good to me</p>",
  clientVisible: false,
  parentCommentId: null,
  deletedAt: null,
  createdAt: "2026-09-15T11:00:00.000Z",
  updatedAt: "2026-09-15T11:00:00.000Z",
  user: AUTHOR,
};

describe("ticketDetailContract — comments survive the contract", () => {
  it("keeps the comments the detail endpoint returns", () => {
    const parsed = ticketDetailContract.parse(detailPayload([COMMENT]));

    expect(parsed.comments).toHaveLength(1);
    expect(parsed.comments[0].id).toBe(501);
    expect(parsed.comments[0].content).toBe("<p>Looks good to me</p>");
  });

  it("keeps the comment author so the feed renders a name, not a fallback", () => {
    const parsed = ticketDetailContract.parse(detailPayload([COMMENT]));

    expect(parsed.comments[0].user).toEqual(AUTHOR);
  });

  it("keeps a reply's parentCommentId so threading survives a refetch", () => {
    const reply = { ...COMMENT, id: 502, parentCommentId: 501 };
    const parsed = ticketDetailContract.parse(detailPayload([COMMENT, reply]));

    expect(parsed.comments.map((c) => c.parentCommentId)).toEqual([null, 501]);
  });

  it("accepts a ticket with no comments", () => {
    const parsed = ticketDetailContract.parse(detailPayload([]));

    expect(parsed.comments).toEqual([]);
  });

  it("keeps comment reactions so the feed can render who reacted", () => {
    const parsed = ticketDetailContract.parse(
      detailPayload([
        {
          ...COMMENT,
          reactions: [
            { emoji: "👍", userId: "user-1" },
            { emoji: "🔥", userId: "user-2" },
          ],
        },
      ]),
    );

    expect(parsed.comments[0].reactions).toEqual([
      { emoji: "👍", userId: "user-1" },
      { emoji: "🔥", userId: "user-2" },
    ]);
  });

  it("defaults missing reactions to an empty list instead of stripping the field", () => {
    const parsed = ticketDetailContract.parse(detailPayload([COMMENT]));

    expect(parsed.comments[0].reactions).toEqual([]);
  });
});
