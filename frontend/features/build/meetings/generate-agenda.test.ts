import { generateAgenda } from "./generate-agenda";
import type { GenerateAgendaOptions, AgendaSource } from "./generate-agenda";
import type { Ticket, Cycle } from "@/types/projects";

function makeCycle(id: number, name: string): Cycle {
  return {
    id,
    name,
    projectId: 1,
    orgId: "org-1",
    status: "active",
    startDate: null,
    endDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } as unknown as Cycle;
}

function makeTicket(
  id: number,
  overrides: Partial<{
    cycleId: number | null;
    status: string;
    priority: string;
    dueDate: string | null;
    updatedAt: string | null;
    title: string;
  }> = {},
): Ticket {
  return {
    id,
    title: `Ticket ${id}`,
    status: "TODO",
    priority: "MEDIUM",
    cycleId: null,
    dueDate: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as Ticket;
}

describe("generateAgenda — positive control assertions (non-empty)", () => {
  it("returns a non-empty string when a cycle has matching open tickets", () => {
    const cycle = makeCycle(10, "Sprint 1");
    const tickets = [
      makeTicket(1, { cycleId: 10, status: "TODO", title: "Ship login page" }),
      makeTicket(2, { cycleId: 10, status: "IN_PROGRESS", title: "Fix billing bug" }),
    ];
    const result = generateAgenda({ cycle, tickets, sources: ["cycle"] });
    expect(result).not.toBe("");
    expect(result).toContain("Sprint 1");
    expect(result).toContain("Ship login page");
  });

  it("uses cycleId equality, not sprint_id — sprint_id was removed from project_meetings", () => {
    const cycle = makeCycle(42, "Cycle Q3");
    const ticketInCycle = makeTicket(1, { cycleId: 42, title: "In-cycle item" });
    const ticketElsewhere = makeTicket(2, { cycleId: 99, title: "Different cycle item" });
    const result = generateAgenda({
      cycle,
      tickets: [ticketInCycle, ticketElsewhere],
      sources: ["cycle"],
    });
    expect(result).toContain("In-cycle item");
    expect(result).not.toContain("Different cycle item");
  });

  it("excludes DONE and CANCELLED tickets from the cycle section so agenda only shows open work", () => {
    const cycle = makeCycle(5, "Active Sprint");
    const tickets = [
      makeTicket(1, { cycleId: 5, status: "TODO", title: "Pending task" }),
      makeTicket(2, { cycleId: 5, status: "DONE", title: "Already shipped" }),
      makeTicket(3, { cycleId: 5, status: "CANCELLED", title: "Dropped" }),
    ];
    const result = generateAgenda({ cycle, tickets, sources: ["cycle"] });
    expect(result).toContain("Pending task");
    expect(result).not.toContain("Already shipped");
    expect(result).not.toContain("Dropped");
  });

  it("returns non-empty agenda for overdue source when past-due tickets exist", () => {
    const overdue = makeTicket(1, {
      status: "TODO",
      dueDate: "2020-01-01",
      title: "Ancient overdue item",
    });
    const result = generateAgenda({ tickets: [overdue], sources: ["overdue"] });
    expect(result).not.toBe("");
    expect(result).toContain("Ancient overdue item");
  });

  it("returns non-empty agenda for blocked source when BLOCKED tickets exist", () => {
    const blocked = makeTicket(1, { status: "BLOCKED", title: "Waiting on infra" });
    const result = generateAgenda({ tickets: [blocked], sources: ["blocked"] });
    expect(result).not.toBe("");
    expect(result).toContain("Waiting on infra");
  });

  it("returns non-empty agenda for recently_completed source when DONE tickets exist", () => {
    const done = makeTicket(1, {
      status: "DONE",
      title: "Shipped last week",
      updatedAt: new Date().toISOString(),
    });
    const result = generateAgenda({ tickets: [done], sources: ["recently_completed"] });
    expect(result).not.toBe("");
    expect(result).toContain("Shipped last week");
  });

  it("always returns non-empty for open_action_items source regardless of tickets", () => {
    const result = generateAgenda({ tickets: [], sources: ["open_action_items"] });
    expect(result).not.toBe("");
    expect(result).toContain("Action Items");
  });
});

describe("generateAgenda — empty result cases", () => {
  it("returns empty string when sources array is empty", () => {
    const cycle = makeCycle(1, "Sprint");
    const tickets = [makeTicket(1, { cycleId: 1 })];
    const result = generateAgenda({ cycle, tickets, sources: [] });
    expect(result).toBe("");
  });

  it("returns empty string when cycle source requested but cycle has no open matching tickets", () => {
    const cycle = makeCycle(1, "Empty Sprint");
    const doneTicket = makeTicket(1, { cycleId: 1, status: "DONE" });
    const result = generateAgenda({ cycle, tickets: [doneTicket], sources: ["cycle"] });
    expect(result).toContain("No open tickets in this cycle");
  });

  it("returns empty string when no tickets match any requested source", () => {
    const sources: AgendaSource[] = ["overdue", "blocked", "recently_completed"];
    const result = generateAgenda({ tickets: [], sources });
    expect(result).toBe("");
  });
});

describe("generateAgenda — section numbering", () => {
  it("numbers multiple sections sequentially so each is findable in the output", () => {
    const cycle = makeCycle(1, "Sprint");
    const tickets = [
      makeTicket(1, { cycleId: 1, title: "Cycle task" }),
      makeTicket(2, { status: "BLOCKED", title: "Blocker" }),
    ];
    const result = generateAgenda({
      cycle,
      tickets,
      sources: ["cycle", "blocked"],
    });
    expect(result).toContain("1.");
    expect(result).toContain("2.");
  });
});
