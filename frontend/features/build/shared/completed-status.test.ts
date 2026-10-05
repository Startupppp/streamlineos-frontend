import { ZodError } from "zod";
import { getCompletedStatusNames, isCompletedTicketStatus, filterHiddenCompletedTickets } from "./completed-status";
import { projectDetailContract } from "@/hooks/api/build/build-project-schema";

describe("getCompletedStatusNames", () => {
  it("returns DONE as the seed entry when no statuses are supplied", () => {
    const names = getCompletedStatusNames(undefined);
    expect(names.has("DONE")).toBe(true);
    expect(names.size).toBe(1);
  });

  it("includes a renamed completed status when its type is completed", () => {
    const statuses = [
      { name: "Shipped", type: "completed" as const },
      { name: "In Review", type: "started" as const },
    ];
    const names = getCompletedStatusNames(statuses);
    expect(names.has("Shipped")).toBe(true);
    expect(names.has("DONE")).toBe(true);
  });

  it("does not include a status whose type is null", () => {
    const statuses = [{ name: "Legacy", type: null }];
    const names = getCompletedStatusNames(statuses);
    expect(names.has("Legacy")).toBe(false);
    expect(names.has("DONE")).toBe(true);
  });

  it("does not include a status whose type is started or cancelled", () => {
    const statuses = [
      { name: "In Progress", type: "started" as const },
      { name: "Cancelled", type: "cancelled" as const },
    ];
    const names = getCompletedStatusNames(statuses);
    expect(names.has("In Progress")).toBe(false);
    expect(names.has("Cancelled")).toBe(false);
  });

  it("includes multiple completed statuses when a project has more than one", () => {
    const statuses = [
      { name: "Shipped", type: "completed" as const },
      { name: "Released", type: "completed" as const },
    ];
    const names = getCompletedStatusNames(statuses);
    expect(names.has("Shipped")).toBe(true);
    expect(names.has("Released")).toBe(true);
  });
});

describe("isCompletedTicketStatus", () => {
  it("returns true for DONE without any statuses list", () => {
    expect(isCompletedTicketStatus("DONE", undefined)).toBe(true);
  });

  it("returns true for a renamed completed status", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    expect(isCompletedTicketStatus("Shipped", statuses)).toBe(true);
  });

  it("returns false for a status with a null type", () => {
    const statuses = [{ name: "Legacy", type: null }];
    expect(isCompletedTicketStatus("Legacy", statuses)).toBe(false);
  });

  it("returns false for a status with a started type", () => {
    const statuses = [{ name: "In Progress", type: "started" as const }];
    expect(isCompletedTicketStatus("In Progress", statuses)).toBe(false);
  });
});

describe("filterHiddenCompletedTickets", () => {
  it("removes tickets with a renamed completed status when hideCompleted is true", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    const tickets = [
      { status: "Shipped", title: "Task A" },
      { status: "In Progress", title: "Task B" },
    ];
    const result = filterHiddenCompletedTickets(tickets, true, statuses);
    expect(result.map((t) => t.title)).toEqual(["Task B"]);
  });

  it("keeps all tickets when hideCompleted is false regardless of group", () => {
    const statuses = [{ name: "Shipped", type: "completed" as const }];
    const tickets = [
      { status: "Shipped", title: "Task A" },
      { status: "In Progress", title: "Task B" },
    ];
    const result = filterHiddenCompletedTickets(tickets, false, statuses);
    expect(result).toHaveLength(2);
  });
});

describe("projectDetailContract — statuses include type field parsed from actual contract", () => {
  const baseProjectRow = {
    id: 1,
    orgId: "org-1",
    name: "Test Project",
    description: null,
    key: "TP",
    clientMembershipId: null,
    managerMembershipId: null,
    startDate: null,
    endDate: null,
    status: "ACTIVE",
    priority: null,
    dealId: null,
    managedProductId: null,
    budget: null,
    budgetMinor: null,
    budgetCurrency: null,
    settings: null,
    crmClient: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("parses a status row with a null type — historical rows that pre-date the column", () => {
    const payload = {
      ...baseProjectRow,
      statuses: [
        {
          id: 1,
          projectId: 1,
          orgId: "org-1",
          name: "Old Status",
          order: 0,
          color: null,
          type: null,
          wipLimit: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      members: [],
    };
    const result = projectDetailContract.parse(payload);
    expect(result.statuses[0]?.type).toBeNull();
  });

  it("parses a status row with a completed type — a custom renamed completed column", () => {
    const payload = {
      ...baseProjectRow,
      statuses: [
        {
          id: 2,
          projectId: 1,
          orgId: "org-1",
          name: "Shipped",
          order: 3,
          color: "#00FF00",
          type: "completed",
          wipLimit: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      members: [],
    };
    const result = projectDetailContract.parse(payload);
    expect(result.statuses[0]?.type).toBe("completed");
    expect(result.statuses[0]?.name).toBe("Shipped");
  });

  it("rejects a status row with an invalid type value", () => {
    const payload = {
      ...baseProjectRow,
      statuses: [
        {
          id: 3,
          projectId: 1,
          orgId: "org-1",
          name: "Weird",
          order: 0,
          color: null,
          type: "invalid-not-an-enum-value",
          wipLimit: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      members: [],
    };
    expect(() => projectDetailContract.parse(payload)).toThrow(ZodError);
  });

  it("the parsed type field drives getCompletedStatusNames without any type cast", () => {
    const payload = {
      ...baseProjectRow,
      statuses: [
        {
          id: 4,
          projectId: 1,
          orgId: "org-1",
          name: "Shipped",
          order: 3,
          color: null,
          type: "completed",
          wipLimit: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: 5,
          projectId: 1,
          orgId: "org-1",
          name: "Todo",
          order: 0,
          color: null,
          type: null,
          wipLimit: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      members: [],
    };
    const project = projectDetailContract.parse(payload);
    const completedNames = getCompletedStatusNames(project.statuses);
    expect(completedNames.has("Shipped")).toBe(true);
    expect(completedNames.has("Todo")).toBe(false);
    expect(completedNames.has("DONE")).toBe(true);
  });
});
