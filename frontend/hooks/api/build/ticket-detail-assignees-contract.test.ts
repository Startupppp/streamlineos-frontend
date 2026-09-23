import { ticketDetailContract } from "./build-tickets-core-schema";

function person(id: string, name: string) {
  return { id, name, firstName: name, lastName: null, email: `${id}@example.com`, image: null };
}

const DETAIL_RESPONSE = {
  id: 12,
  orgId: "org-1",
  title: "Ship the thing",
  description: null,
  reporterMembershipId: 4,
  completionPercentage: 0,
  clientVisible: false,
  isRecurring: false,
  recurrenceRule: null,
  recurrenceParentId: null,
  recurrenceNextRunAt: null,
  customerId: null,
  version: 1,
  deletedAt: null,
  type: "TASK",
  status: "TODO",
  priority: "MEDIUM",
  projectId: 3,
  ticketNumber: 12,
  epicId: null,
  assigneeMembershipId: 4,
  reporterId: "user-a",
  points: null,
  storyPoints: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: "0.00",
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  sequenceId: null,
  estimate: null,
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt: "2026-09-18T10:00:00.000Z",
  comments: [],
  project: { id: 3, name: "Apollo", key: "APO", orgId: "org-1" },
  epic: null,
  assignee: { user: person("user-a", "Ada") },
  reporter: person("user-a", "Ada"),
  assignees: [
    { id: 1, ticketId: 12, assignedAt: "2026-09-18T10:00:00.000Z", assignedBy: "user-a", user: { userId: "user-a", user: person("user-a", "Ada") } },
    { id: 2, ticketId: 12, assignedAt: "2026-09-18T10:05:00.000Z", assignedBy: "user-a", user: { userId: "user-b", user: person("user-b", "Blair") } },
  ],
  watchers: [],
  attachments: [],
  labels: [],
};

describe("the ticket detail contract keeps the whole assignee roster", () => {
  it("decodes every assignee, not just the single primary one", () => {
    const detail = ticketDetailContract.parse(DETAIL_RESPONSE);
    expect(detail.assignees.map((a) => a.userId)).toEqual(["user-a", "user-b"]);
  });

  it("exposes the roster under the key the sidebar reads, so removing one assignee cannot wipe the rest", () => {
    /*
      The sidebar builds `currentAssigneeIds` from `ticket.assignees` and sends the
      remainder back as `assigneeIds`. While the contract published this array under
      `members`, `ticket.assignees` was undefined, the list collapsed to the single
      `assignee`, and removing that one sent `assigneeIds: []` — deleting every row.
    */
    const detail = ticketDetailContract.parse(DETAIL_RESPONSE);
    const remaining = detail.assignees.filter((a) => a.userId !== "user-a").map((a) => a.userId);
    expect(remaining).toEqual(["user-b"]);
  });

  it("carries each assignee's person so the roster renders a name, never a raw id", () => {
    const detail = ticketDetailContract.parse(DETAIL_RESPONSE);
    expect(detail.assignees[1]?.user?.name).toBe("Blair");
  });
});
