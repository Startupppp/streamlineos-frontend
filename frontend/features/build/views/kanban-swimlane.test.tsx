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

describe("getTicketRowKey — existing cases", () => {
  it("returns the status name unchanged when rowBy is status", () => {
    expect(getTicketRowKey(makeTicket({ status: "IN_REVIEW" }), "status")).toBe("IN_REVIEW");
  });

  it("returns 'Unassigned' when rowBy is assignee and ticket has no assignee", () => {
    expect(getTicketRowKey(makeTicket({}), "assignee")).toBe("Unassigned");
  });

  it("returns the priority string when rowBy is priority", () => {
    expect(getTicketRowKey(makeTicket({ priority: "HIGH" }), "priority")).toBe("HIGH");
  });

  it("returns 'None' when rowBy is priority and ticket has no priority", () => {
    expect(getTicketRowKey(makeTicket({ priority: null }), "priority")).toBe("None");
  });

  it("returns the cycle name when rowBy is cycle", () => {
    const ticket = makeTicket({
      cycle: { id: 1, name: "Sprint 1", status: "active", startDate: "2026-01-01", endDate: "2026-01-14" },
    });
    expect(getTicketRowKey(ticket, "cycle")).toBe("Sprint 1");
  });
});

describe("getTicketRowKey — label (new case)", () => {
  it("returns the first label name when the ticket has labels", () => {
    const ticket = makeTicket({
      labels: [
        { label: { id: 1, name: "bug", color: "#f00" } },
        { label: { id: 2, name: "urgent", color: "#f00" } },
      ],
    });
    expect(getTicketRowKey(ticket, "label")).toBe("bug");
  });

  it("returns 'No label' when the ticket has no labels", () => {
    expect(getTicketRowKey(makeTicket({ labels: [] }), "label")).toBe("No label");
  });

  it("returns 'No label' when labels is undefined", () => {
    expect(getTicketRowKey(makeTicket({}), "label")).toBe("No label");
  });
});

describe("getTicketRowKey — project (new case)", () => {
  it("returns the project name when the ticket has a project", () => {
    const ticket = makeTicket({ project: { id: 7, name: "Website Redesign", key: "WR" } });
    expect(getTicketRowKey(ticket, "project")).toBe("Website Redesign");
  });

  it("returns 'No project' when the ticket has no project", () => {
    expect(getTicketRowKey(makeTicket({ project: null }), "project")).toBe("No project");
  });
});

describe("getTicketRowKey — status columns are not affected by label/project cases", () => {
  it("status key is never 'No label' for a ticket with a label", () => {
    const ticket = makeTicket({
      status: "DONE",
      labels: [{ label: { id: 1, name: "bug", color: null } }],
    });
    expect(getTicketRowKey(ticket, "status")).toBe("DONE");
    expect(getTicketRowKey(ticket, "label")).toBe("bug");
  });
});
