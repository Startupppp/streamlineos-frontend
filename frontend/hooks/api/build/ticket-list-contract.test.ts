import { allWorkPageContract, ticketListPageContract, ticketRowContract } from "./build-tickets-schema";

it("parses the actual all-work projection without unreturned tenant or membership fields", () => {
  const row = { id: 1, title: "Ticket", type: "BUG", status: "OPEN", priority: "HIGH", projectId: 42, projectKey: "BUILD", projectName: "Project", ticketNumber: 1, dueDate: null, startDate: null, points: null, estimate: null, rank: "a0", sprintId: null, cycleId: null, epicId: null, assigneeId: null, assignee: null, labels: [], createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z" };
  const result = allWorkPageContract.parse({ data: [row], limit: 1, nextCursor: "opaque", hasMore: true });
  expect(result.data[0]).toEqual(row);
  expect(result.nextCursor).toBe("opaque");
  expect(allWorkPageContract.safeParse({ ...result, data: [{ ...row, projectName: undefined }] }).success).toBe(false);
});

it("parses light ticket rows and preserves board assignees, labels and cursor", () => {
  const user = { id: "user-1", name: "Member", firstName: "Member", lastName: null, email: "member@example.test", image: null };
  const row = {
    id: 1, orgId: "org-1", title: "Ticket", type: "BUG", status: "OPEN", priority: "HIGH",
    projectId: 42, ticketNumber: 1, sprintId: null, epicId: null, assigneeMembershipId: 7,
    reporterId: null, points: null, storyPoints: null, link: null, rank: "a0", parentTicketId: null,
    originalEstimate: null, timeSpent: "0", startDate: null, dueDate: null, moduleId: null,
    cycleId: null, sequenceId: null, estimate: null, createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z",
    descriptionExcerpt: "A short plain-text excerpt of the ticket body",
    assigneeId: user.id, assignee: user, assignees: [{ id: 1, ticketId: 1, assignedAt: "2026-09-09T00:00:00Z", assignedBy: null, userId: user.id, user }],
    labels: [{ id: 1, ticketId: 1, labelId: 3, createdAt: "2026-09-09T00:00:00Z", label: { id: 3, orgId: "org-1", createdAt: "2026-09-09T00:00:00Z", name: "Bug", color: null } }], cycle: null,
  };
  const result = ticketListPageContract.parse({ data: [row], pagination: { limit: 25, hasMore: true, nextCursor: "next" } });
  expect(result.data[0]?.assignee).toEqual(user);
  expect(result.data[0]?.assignees[0]?.user).toEqual(user);
  expect(result.data[0]?.labels[0]?.label?.name).toBe("Bug");
  expect(result.pagination.nextCursor).toBe("next");
  expect(ticketRowContract.safeParse(row).success).toBe(false);
  expect(ticketListPageContract.safeParse({ ...result, data: [{ ...row, rank: undefined }] }).success).toBe(false);
});

it("rejects a board row missing descriptionExcerpt, so the card cannot be built against a projection the API does not send", () => {
  const user = { id: "user-1", name: "Member", firstName: "Member", lastName: null, email: "member@example.test", image: null };
  const row = {
    id: 1, orgId: "org-1", title: "Ticket", type: "BUG", status: "OPEN", priority: "HIGH",
    projectId: 42, ticketNumber: 1, sprintId: null, epicId: null, assigneeMembershipId: 7,
    reporterId: null, points: null, storyPoints: null, link: null, rank: "a0", parentTicketId: null,
    originalEstimate: null, timeSpent: "0", startDate: null, dueDate: null, moduleId: null,
    cycleId: null, sequenceId: null, estimate: null, createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z",
    assigneeId: user.id, assignee: user, assignees: [], labels: [], cycle: null,
  };

  expect(ticketListPageContract.safeParse({ data: [row], pagination: { limit: 25, hasMore: false, nextCursor: null } }).success).toBe(false);
  expect(ticketListPageContract.safeParse({ data: [{ ...row, descriptionExcerpt: "" }], pagination: { limit: 25, hasMore: false, nextCursor: null } }).success).toBe(true);
});
