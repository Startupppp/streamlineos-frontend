import { isOverdue } from "./table-view-types";

const PAST_DATE = "2020-01-01";
const FUTURE_DATE = "2099-01-01";

describe("isOverdue — completed-status-aware", () => {
  it("returns false when the ticket has no due date", () => {
    expect(isOverdue({ id: 1, title: "T", status: "IN_PROGRESS", type: "STORY", version: 1 })).toBe(false);
  });

  it("returns true for a past due date with a non-completed status", () => {
    expect(isOverdue({ id: 1, title: "T", status: "IN_PROGRESS", type: "STORY", version: 1, dueDate: PAST_DATE })).toBe(true);
  });

  it("returns false for DONE with no statuses list (legacy fallback)", () => {
    expect(isOverdue({ id: 1, title: "T", status: "DONE", type: "STORY", version: 1, dueDate: PAST_DATE })).toBe(false);
  });

  it("returns false for a renamed completed column — the ticket is not overdue", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    expect(isOverdue({ id: 1, title: "T", status: "Shipped", type: "STORY", version: 1, dueDate: PAST_DATE }, statuses)).toBe(false);
  });

  it("returns true for a renamed completed column when the ticket is not in that column", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    expect(isOverdue({ id: 1, title: "T", status: "In Progress", type: "STORY", version: 1, dueDate: PAST_DATE }, statuses)).toBe(true);
  });

  it("returns false when the due date is in the future even without statuses", () => {
    expect(isOverdue({ id: 1, title: "T", status: "IN_PROGRESS", type: "STORY", version: 1, dueDate: FUTURE_DATE })).toBe(false);
  });

  it("returns false for a renamed completed column with a future due date", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    expect(isOverdue({ id: 1, title: "T", status: "Shipped", type: "STORY", version: 1, dueDate: FUTURE_DATE }, statuses)).toBe(false);
  });
});
