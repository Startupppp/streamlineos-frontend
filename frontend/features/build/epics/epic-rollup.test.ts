import type { Ticket } from "@/types/projects/tasks";
import type { ProjectStatusRecord } from "@/types/projects/projects";
import { computeEpicRollup } from "./epic-card";

const BASE_TICKET: Ticket = {
  id: 1,
  orgId: "org-1",
  title: "Ticket",
  type: "STORY",
  status: "TODO",
  priority: null,
  projectId: 1,
  ticketNumber: 1,
  epicId: 10,
  reporterId: null,
  points: null,
  storyPoints: null,
  link: null,
  rank: "a0",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: null,
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  sequenceId: null,
  estimate: null,
  createdAt: null,
  updatedAt: null,
};

function makeChild(id: number, type: string, status: string, points?: number): Ticket {
  return { ...BASE_TICKET, id, type, status, points: points ?? null };
}

const BASE_STATUS: ProjectStatusRecord = {
  id: 1,
  orgId: "org-1",
  projectId: 1,
  name: "TODO",
  order: 1,
  color: null,
  createdAt: null,
  updatedAt: null,
};

function makeStatus(id: number, name: string, type: string): ProjectStatusRecord {
  return { ...BASE_STATUS, id, name, type };
}

describe("computeEpicRollup", () => {
  it("counts TASK- and BUG-type children toward an epic's total, not just STORY types", () => {
    const children = [
      makeChild(1, "STORY", "IN_PROGRESS"),
      makeChild(2, "TASK", "DONE"),
      makeChild(3, "TASK", "TODO"),
      makeChild(4, "BUG", "TODO"),
    ];
    const result = computeEpicRollup(children, undefined);
    expect(result.totalItems).toBe(4);
  });

  it("marks a ticket completed when its status matches a project-configured completed status that is not named DONE", () => {
    const children = [
      makeChild(1, "STORY", "SHIPPED"),
      makeChild(2, "TASK", "SHIPPED"),
      makeChild(3, "STORY", "TODO"),
    ];
    const statuses = [
      makeStatus(1, "TODO", "unstarted"),
      makeStatus(2, "SHIPPED", "completed"),
    ];
    const result = computeEpicRollup(children, statuses);
    expect(result.completedItems).toBe(2);
    expect(result.todoItems).toBe(1);
  });

  it("falls back to DONE as the completed status when the project ships no status list", () => {
    const children = [
      makeChild(1, "STORY", "DONE"),
      makeChild(2, "TASK", "IN_PROGRESS"),
      makeChild(3, "BUG", "TODO"),
    ];
    const result = computeEpicRollup(children, undefined);
    expect(result.completedItems).toBe(1);
    expect(result.inProgressItems).toBe(1);
    expect(result.todoItems).toBe(1);
  });

  it("returns zero for every counter when an epic has no children, so no division by zero can occur", () => {
    const result = computeEpicRollup([], undefined);
    expect(result.totalItems).toBe(0);
    expect(result.completedItems).toBe(0);
    expect(result.inProgressItems).toBe(0);
    expect(result.todoItems).toBe(0);
    expect(result.totalPoints).toBe(0);
    expect(result.completedPoints).toBe(0);
  });

  it("accumulates story points across all child types and attributes them to completedPoints only when the status is completed", () => {
    const children = [
      makeChild(1, "STORY", "DONE", 3),
      makeChild(2, "TASK", "TODO", 5),
      makeChild(3, "BUG", "IN_PROGRESS", 2),
    ];
    const result = computeEpicRollup(children, undefined);
    expect(result.totalPoints).toBe(10);
    expect(result.completedPoints).toBe(3);
  });
});
