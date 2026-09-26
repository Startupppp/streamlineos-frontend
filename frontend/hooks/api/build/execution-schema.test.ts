import {
  cycleListContract,
  cycleRowContract,
  epicListContract,
  workloadCapacityContract,
  modulePageContract,
} from "./execution-schema";

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

const baseCapacityMember = {
  userId: "user-abc",
  membershipId: 42,
  workingDaysInWindow: 10,
  leaveDays: 1,
  halfLeaveDays: 0,
  netCapacityDays: 9,
  capacityHours: 72,
  loggedHours: 40,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: 55.6,
};

it("workloadCapacityContract accepts a well-formed capacity response — the workload view reads this shape from the allocation endpoint", () => {
  const response = { members: [baseCapacityMember] };
  const result = workloadCapacityContract.parse(response);
  expect(result.members[0]?.userId).toBe("user-abc");
  expect(result.members[0]?.isOverAllocated).toBe(false);
});

it("workloadCapacityContract accepts null capacityHours — a member with no configured capacity reports null, not zero", () => {
  const member = { ...baseCapacityMember, capacityHours: null };
  const result = workloadCapacityContract.parse({ members: [member] });
  expect(result.members[0]?.capacityHours).toBeNull();
});

it("workloadCapacityContract rejects a member whose utilizationPercent is absent — a missing field would render the bar as indeterminate with no gate catching it", () => {
  const { utilizationPercent: _u, ...withoutUtil } = baseCapacityMember;
  expect(
    workloadCapacityContract.safeParse({ members: [withoutUtil] }).success,
  ).toBe(false);
});

it("workloadCapacityContract rejects a response that sends members as an array directly instead of wrapped — the envelope is { members: [] } not []", () => {
  expect(
    workloadCapacityContract.safeParse([baseCapacityMember]).success,
  ).toBe(false);
});

const baseModuleListItem = {
  id: 3,
  name: "Checkout",
  orgId: "org-1",
  status: "in-progress" as const,
  leadId: null,
  endDate: null,
  startDate: null,
  createdBy: "user-1",
  projectId: 7,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  description: null,
  totalItems: 8,
  completedItems: 3,
  progress: 37,
};

it("modulePageContract accepts a paginated module response with cursor envelope — the modules list endpoint returns this shape", () => {
  const response = {
    data: [baseModuleListItem],
    pagination: { limit: 20, hasMore: false, nextCursor: null },
  };
  const result = modulePageContract.parse(response);
  expect(result.data[0]?.name).toBe("Checkout");
  expect(result.pagination.hasMore).toBe(false);
});

it("modulePageContract rejects a module with an invalid status enum — status is a pgEnum and z.string() would silently accept garbage values", () => {
  const bad = { ...baseModuleListItem, status: "ACTIVE" };
  const response = {
    data: [bad],
    pagination: { limit: 20, hasMore: false, nextCursor: null },
  };
  expect(modulePageContract.safeParse(response).success).toBe(false);
});

it("modulePageContract rejects a missing pagination field — the client uses hasMore to decide whether to offer more pages", () => {
  const response = { data: [baseModuleListItem] };
  expect(modulePageContract.safeParse(response).success).toBe(false);
});
