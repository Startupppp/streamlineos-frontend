import { epicListContract, sprintListContract } from "./execution-schema";

it("preserves sprint tickets used by progress summaries", () => {
  const tickets = [
    {
      id: 7,
      title: "Scoped ticket",
      status: "IN_REVIEW",
      points: 8,
      sprintId: 2,
    },
  ];

  const result = sprintListContract.parse([
    {
      id: 2,
      orgId: "org-1",
      projectId: 5,
      name: "Sprint 1",
      startDate: "2026-09-15T00:00:00.000Z",
      endDate: "2026-09-29T00:00:00.000Z",
      goal: null,
      status: "PLANNED",
      tickets,
    },
  ]);

  expect(result[0]?.tickets).toEqual(tickets);
});

it("accepts the unprojected ticket row listEpics actually returns, since the service selects every tickets column with no projection", () => {
  const row = {
    id: 9,
    orgId: "org-1",
    title: "Epic title",
    description: null,
    type: "EPIC",
    status: "TODO",
    priority: "MEDIUM",
    projectId: 5,
    ticketNumber: 3,
    sprintId: null,
    epicId: null,
    reporterId: "user-1",
    points: null,
    storyPoints: null,
    link: null,
    rank: "1000",
    parentTicketId: null,
    originalEstimate: null,
    timeSpent: "0",
    startDate: null,
    dueDate: null,
    moduleId: null,
    cycleId: null,
    sequenceId: null,
    estimate: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  const result = epicListContract.parse([row]);

  expect(result[0]).toEqual(row);
});

it("rejects an epic row whose reporterId is not a string, so an assignee/reporter id swap is caught", () => {
  const row = {
    id: 9,
    orgId: "org-1",
    title: "Epic title",
    description: null,
    type: "EPIC",
    status: "TODO",
    priority: "MEDIUM",
    projectId: 5,
    ticketNumber: 3,
    sprintId: null,
    epicId: null,
    reporterId: 12345,
    points: null,
    storyPoints: null,
    link: null,
    rank: "1000",
    parentTicketId: null,
    originalEstimate: null,
    timeSpent: "0",
    startDate: null,
    dueDate: null,
    moduleId: null,
    cycleId: null,
    sequenceId: null,
    estimate: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  expect(epicListContract.safeParse([row]).success).toBe(false);
});
