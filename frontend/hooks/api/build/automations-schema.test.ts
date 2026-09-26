import { z } from "zod";

const projectAutomationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
  value: z.string().optional(),
});

const projectAutomationActionSchema = z.object({
  type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment"]),
  value: z.string(),
});

const projectAutomationListItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(projectAutomationConditionSchema),
  actions: z.array(projectAutomationActionSchema),
  createdAt: z.string(),
});

const projectAutomationRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(projectAutomationConditionSchema),
  actions: z.array(projectAutomationActionSchema),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const projectAutomationListContract = z.array(projectAutomationListItemSchema);
const projectAutomationRowContract = projectAutomationRowSchema;

describe("projectAutomationListContract (BLD-X-BE-SETTINGS-AUTO-001)", () => {
  it("accepts a valid automation list", () => {
    const raw = [
      {
        id: 1,
        projectId: 10,
        name: "Auto-assign on create",
        isActive: true,
        triggerEvent: "ticket.created",
        conditions: [],
        actions: [{ type: "set_assignee", value: "user-abc" }],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("rejects an automation list item missing required name", () => {
    const raw = [
      {
        id: 1,
        projectId: 10,
        isActive: true,
        triggerEvent: "ticket.created",
        conditions: [],
        actions: [{ type: "set_status", value: "done" }],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an automation with an unknown action type — z.string() over an enum would silently accept this", () => {
    const raw = [
      {
        id: 1,
        projectId: 10,
        name: "test",
        isActive: true,
        triggerEvent: "ticket.created",
        conditions: [],
        actions: [{ type: "unknown_type", value: "x" }],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects a condition with an unknown operator", () => {
    const raw = [
      {
        id: 1,
        projectId: 10,
        name: "test",
        isActive: true,
        triggerEvent: "ticket.created",
        conditions: [{ field: "status", operator: "after", value: "done" }],
        actions: [{ type: "set_status", value: "done" }],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });
});

describe("projectAutomationRowContract (BLD-X-BE-SETTINGS-AUTO-002)", () => {
  it("accepts a valid automation row with all fields", () => {
    const raw = {
      id: 1,
      orgId: "org-abc",
      projectId: 10,
      name: "Auto-triage",
      isActive: false,
      triggerEvent: "ticket.assigned",
      conditions: [{ field: "status", operator: "equals", value: "todo" }],
      actions: [{ type: "set_priority", value: "high" }],
      createdBy: "user-xyz",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
    };
    const result = projectAutomationRowContract.parse(raw);
    expect(result.id).toBe(1);
    expect(result.isActive).toBe(false);
  });

  it("accepts createdBy as null", () => {
    const raw = {
      id: 2,
      orgId: "org-abc",
      projectId: 10,
      name: "test",
      isActive: true,
      triggerEvent: "ticket.updated",
      conditions: [],
      actions: [{ type: "add_comment", value: "Auto-commented" }],
      createdBy: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
    };
    expect(() => projectAutomationRowContract.parse(raw)).not.toThrow();
  });

  it("rejects a row missing updatedAt — omitted field is stripped by z.object not caught by strict", () => {
    const raw = {
      id: 3,
      orgId: "org-abc",
      projectId: 10,
      name: "test",
      isActive: true,
      triggerEvent: "ticket.created",
      conditions: [],
      actions: [{ type: "set_status", value: "done" }],
      createdBy: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(() => projectAutomationRowContract.parse(raw)).toThrow();
  });
});
