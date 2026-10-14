import { groupTicketsByKey, buildColumns, applyColumnOrder } from "./kanban-board-utils";
import { getTicketRowKey } from "./kanban-swimlane";
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

describe("columnBy grouping covers every option the Columns menu offers (B-035)", () => {
  it("groups by label, cycle and project, each with a bucket for tickets that have none", () => {
    const tickets = [
      makeTicket({
        id: 1,
        labels: [{ label: { id: 1, name: "bug", color: "#000" } }],
        cycle: { id: 1, name: "Cycle 1" },
        project: { id: 7, name: "QA Project Alpha" },
      }),
      makeTicket({
        id: 2,
        labels: [{ label: { id: 1, name: "bug", color: "#000" } }],
        cycle: { id: 2, name: "Cycle 2" },
        project: { id: 7, name: "QA Project Alpha" },
      }),
      makeTicket({ id: 3 }),
    ];

    const byLabel = groupTicketsByKey(tickets, (t) => getTicketRowKey(t, "label"));
    expect(byLabel.get("bug")).toHaveLength(2);
    expect(byLabel.get("No label")).toHaveLength(1);

    const byCycle = groupTicketsByKey(tickets, (t) => getTicketRowKey(t, "cycle"));
    expect(byCycle.get("Cycle 1")).toHaveLength(1);
    expect(byCycle.get("Cycle 2")).toHaveLength(1);
    expect(byCycle.get("No cycle")).toHaveLength(1);

    const byProject = groupTicketsByKey(tickets, (t) => getTicketRowKey(t, "project"));
    expect(byProject.get("QA Project Alpha")).toHaveLength(2);
    expect(byProject.get("No project")).toHaveLength(1);
  });

  it("gives every Columns option a distinct grouping rather than silently falling back to one bucket", () => {
    const tickets = [
      makeTicket({
        id: 1,
        status: "TODO",
        priority: "HIGH",
        assignee: { id: "u1", name: "Alice" },
        labels: [{ label: { id: 1, name: "bug", color: "#000" } }],
        cycle: { id: 1, name: "Cycle 1" },
        project: { id: 7, name: "QA Project Alpha" },
      }),
      makeTicket({ id: 2, status: "DONE", priority: "LOW" }),
    ];

    for (const columnBy of ["status", "priority", "assignee", "label", "cycle", "project"]) {
      const grouped = groupTicketsByKey(tickets, (t) => getTicketRowKey(t, columnBy));
      expect(grouped.size).toBeGreaterThan(1);
    }

    const unknown = groupTicketsByKey(tickets, (t) => getTicketRowKey(t, "nope"));
    expect(unknown.size).toBe(1);
  });
});
