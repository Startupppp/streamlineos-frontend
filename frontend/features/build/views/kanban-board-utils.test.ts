import { groupTicketsByKey, buildColumns, applyColumnOrder } from "./kanban-board-utils";
import type { KanbanTicket } from "../shared/types";

const makeTicket = (overrides: Partial<KanbanTicket>): KanbanTicket => ({
  id: 1,
  title: "Test ticket",
  type: "TASK",
  status: "TODO",
  version: 1,
  ...overrides,
});

describe("groupTicketsByKey", () => {
  it("groups tickets by status key, reproducing the old groupTicketsByStatus behaviour for the status column layout", () => {
    const tickets = [
      makeTicket({ id: 1, status: "TODO" }),
      makeTicket({ id: 2, status: "IN_PROGRESS" }),
      makeTicket({ id: 3, status: "TODO" }),
    ];
    const result = groupTicketsByKey(tickets, (t) => t.status);
    expect(result.get("TODO")).toHaveLength(2);
    expect(result.get("IN_PROGRESS")).toHaveLength(1);
    expect(result.size).toBe(2);
  });

  it("groups tickets by priority so a priority-column layout gets one bucket per value", () => {
    const tickets = [
      makeTicket({ id: 1, priority: "HIGH" }),
      makeTicket({ id: 2, priority: "LOW" }),
      makeTicket({ id: 3, priority: "HIGH" }),
    ];
    const result = groupTicketsByKey(tickets, (t) => t.priority ?? "None");
    expect(result.get("HIGH")).toHaveLength(2);
    expect(result.get("LOW")).toHaveLength(1);
    expect(result.has("TODO")).toBe(false);
  });

  it("does not collapse distinct keys even when they share a status, so assignee columns are independent of status columns", () => {
    const tickets = [
      makeTicket({ id: 1, status: "TODO", assignee: { id: "u1", name: "Alice" } }),
      makeTicket({ id: 2, status: "TODO", assignee: { id: "u2", name: "Bob" } }),
    ];
    const byAssignee = groupTicketsByKey(tickets, (t) => t.assignee?.name ?? "Unassigned");
    const byStatus = groupTicketsByKey(tickets, (t) => t.status);
    expect(byAssignee.size).toBe(2);
    expect(byStatus.size).toBe(1);
  });
});

describe("buildColumns for status layout", () => {
  it("falls back to default columns when no statuses are provided", () => {
    const columns = applyColumnOrder(buildColumns(undefined, []));
    expect(columns.length).toBeGreaterThan(0);
  });

  it("builds a column per status entry with the status name as id", () => {
    const statuses = [
      { id: 1, name: "Backlog", color: null, order: 0 },
      { id: 2, name: "Active", color: "#00f", order: 1 },
    ];
    const columns = applyColumnOrder(buildColumns(statuses, []));
    expect(columns.map((c) => c.id)).toEqual(["Backlog", "Active"]);
  });
});
