import { filterBoardTickets, computeBoardMembers, computeWipLimits, computeDoneCount } from "./board-filter-model";
import type { KanbanTicket } from "@/features/build/shared/types";
import type { ProjectStatus } from "./board-types";

const makeTicket = (overrides: Partial<KanbanTicket> = {}): KanbanTicket => ({
  id: 1,
  title: "Test",
  status: "TODO",
  type: "TASK",
  version: 1,
  ...overrides,
});

const makeStatus = (overrides: Partial<ProjectStatus> = {}): ProjectStatus => ({
  id: 1,
  name: "TODO",
  color: null,
  order: 0,
  type: null,
  ...overrides,
});

describe("filterBoardTickets", () => {
  it("excludes EPIC type tickets", () => {
    const tickets = [makeTicket({ type: "EPIC" }), makeTicket({ type: "TASK" })];
    const result = filterBoardTickets({
      allTickets: tickets,
      hideCompleted: false,
      completedIssues: "all",
      statuses: undefined,
      qaMatchIds: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("TASK");
  });

  it("filters to qaMatchIds when provided", () => {
    const tickets = [makeTicket({ id: 1 }), makeTicket({ id: 2 })];
    const result = filterBoardTickets({
      allTickets: tickets,
      hideCompleted: false,
      completedIssues: "all",
      statuses: undefined,
      qaMatchIds: new Set([1]),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });
});

describe("computeBoardMembers", () => {
  it("returns empty array for undefined input", () => {
    expect(computeBoardMembers(undefined)).toEqual([]);
  });

  it("maps member users to BoardMember shape", () => {
    const members = [{ user: { id: "u1", name: "Alice", firstName: "Alice", lastName: "A", image: null } }];
    const result = computeBoardMembers(members);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("u1");
    expect(result[0]?.name).toBe("Alice");
  });

  it("excludes entries with no user", () => {
    const members = [{ user: null }, { user: { id: "u2", name: null, firstName: null, lastName: null, image: null } }];
    const result = computeBoardMembers(members);
    expect(result).toHaveLength(1);
  });
});

describe("computeWipLimits", () => {
  it("returns empty object for undefined statuses", () => {
    expect(computeWipLimits(undefined)).toEqual({});
  });

  it("maps statuses with wipLimit", () => {
    const statuses = [makeStatus({ name: "In Progress", wipLimit: 5 }), makeStatus({ name: "Done", wipLimit: null })];
    const result = computeWipLimits(statuses);
    expect(result["In Progress"]).toBe(5);
    expect("Done" in result).toBe(false);
  });
});

describe("computeDoneCount", () => {
  it("counts non-EPIC tickets in completed statuses", () => {
    const statuses = [makeStatus({ name: "Done", type: "completed" })];
    const tickets = [
      makeTicket({ status: "Done", type: "TASK" }),
      makeTicket({ status: "Done", type: "EPIC" }),
      makeTicket({ status: "TODO", type: "TASK" }),
    ];
    const result = computeDoneCount(tickets, statuses);
    expect(result).toBe(1);
  });
});
