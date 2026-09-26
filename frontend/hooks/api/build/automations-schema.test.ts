import {
  projectAutomationListContract,
  projectAutomationRowContract,
} from "./build-project-schema";

const VALID_LIST_ITEM = {
  id: 1,
  projectId: 10,
  name: "Auto-assign on create",
  isActive: true,
  triggerEvent: "ticket.created",
  conditions: [],
  actions: [{ type: "set_assignee", value: "user-abc" }],
  createdBy: "user-abc",
  createdByUser: { name: "Ada Lovelace", firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" },
  lastRunAt: null,
  lastFailureAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("projectAutomationListContract (BLD-X-BE-SETTINGS-AUTO-001)", () => {
  it("accepts a valid automation list", () => {
    const raw = [VALID_LIST_ITEM];
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("accepts null for createdBy, createdByUser, lastRunAt, lastFailureAt — all lifecycle moments start as absent", () => {
    const raw = [{ ...VALID_LIST_ITEM, createdBy: null, createdByUser: null, lastRunAt: null, lastFailureAt: null }];
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("accepts lastRunAt and lastFailureAt as ISO strings when set — they are date strings not Date objects on the wire", () => {
    const raw = [{ ...VALID_LIST_ITEM, lastRunAt: "2024-06-01T00:00:00.000Z", lastFailureAt: "2024-06-02T00:00:00.000Z" }];
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("rejects an automation list item missing required name", () => {
    const { name: _n, ...noName } = VALID_LIST_ITEM;
    const raw = [noName];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an automation with an unknown action type — z.string() over an enum would silently accept this", () => {
    const raw = [{ ...VALID_LIST_ITEM, actions: [{ type: "unknown_type", value: "x" }] }];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an automation with an unknown triggerEvent — z.string() over an enum would silently accept this", () => {
    const raw = [{ ...VALID_LIST_ITEM, triggerEvent: "ticket.unknown_event" }];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects a condition with an unknown operator", () => {
    const raw = [{ ...VALID_LIST_ITEM, conditions: [{ field: "status", operator: "after", value: "done" }] }];
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

describe("automations cache key contract (BLD-X-BE-SETTINGS-AUTO-003)", () => {
  it("includes projectId in the automation cache key — correct scope prevents cross-project data leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.automations(10);
    expect(key).toContain(10);
  });

  it("includes 'automations' segment in the cache key", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.automations(10);
    expect(key.some((s: unknown) => s === "automations")).toBe(true);
  });

  it("two different projectIds produce different automation cache keys — cross-project cache collision is impossible", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.automations(1);
    const key2 = buildWorkQueryKeys.projects.automations(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });
});
