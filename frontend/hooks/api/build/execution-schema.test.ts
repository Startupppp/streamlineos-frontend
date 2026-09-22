import { cycleListContract, cycleRowContract, epicListContract } from "./execution-schema";

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

const baseCycleRow = {
  id: 3,
  orgId: "org-1",
  projectId: 7,
  name: "Q4 Cycle",
  description: "Focus on checkout",
  status: "active" as const,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  createdBy: "user-1",
  createdAt: "2026-09-30T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
};

it("cycleRowContract accepts a well-formed cycle — Cycle is the canonical iteration type and its schema must parse", () => {
  const result = cycleRowContract.parse(baseCycleRow);
  expect(result.id).toBe(3);
  expect(result.status).toBe("active");
  expect(result.name).toBe("Q4 Cycle");
});

it("cycleRowContract rejects a cycle with an invalid status — draft/active/completed are the only valid cycle statuses", () => {
  const badRow = { ...baseCycleRow, status: "ACTIVE" };
  expect(cycleRowContract.safeParse(badRow).success).toBe(false);
});

it("cycleListContract preserves progress stats on list items — totalItems/completedItems/progress must survive the parse", () => {
  const listRow = {
    ...baseCycleRow,
    totalItems: 12,
    completedItems: 4,
    progress: 33,
  };

  const result = cycleListContract.parse([listRow]);
  expect(result[0]?.totalItems).toBe(12);
  expect(result[0]?.completedItems).toBe(4);
  expect(result[0]?.progress).toBe(33);
});

it("cycleListContract rejects a list item missing progress — the iteration dashboard summary would silently show 0 without this guard", () => {
  const { progress: _p, ...withoutProgress } = {
    ...baseCycleRow,
    totalItems: 5,
    completedItems: 2,
    progress: 40,
  };
  expect(cycleListContract.safeParse([withoutProgress]).success).toBe(false);
});
