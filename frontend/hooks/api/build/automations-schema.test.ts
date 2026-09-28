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

const VALID_PAGINATION = {
  limit: 50,
  hasMore: false,
  nextCursor: null,
};

describe("projectAutomationListContract — cursor page envelope (BLD-X-BE-SETTINGS-AUTO-001)", () => {
  it("accepts a valid cursor page envelope with data array and pagination fields", () => {
    const raw = { data: [VALID_LIST_ITEM], pagination: VALID_PAGINATION };
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("accepts an empty data array — first-run state before any automations exist", () => {
    const raw = { data: [], pagination: { ...VALID_PAGINATION, hasMore: false, nextCursor: null } };
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("accepts hasMore true with a nextCursor string — full page with more pages to follow", () => {
    const raw = {
      data: [VALID_LIST_ITEM],
      pagination: { limit: 50, hasMore: true, nextCursor: "dGVzdA" },
    };
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("rejects a bare array — the endpoint now returns an envelope and a bare array is the old broken contract", () => {
    const raw = [VALID_LIST_ITEM];
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an envelope missing the pagination field — incomplete envelope renders as an empty list", () => {
    const raw = { data: [VALID_LIST_ITEM] };
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an envelope missing the data field", () => {
    const raw = { pagination: VALID_PAGINATION };
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("accepts null for createdBy, createdByUser, lastRunAt, lastFailureAt — all lifecycle moments start as absent", () => {
    const raw = {
      data: [{ ...VALID_LIST_ITEM, createdBy: null, createdByUser: null, lastRunAt: null, lastFailureAt: null }],
      pagination: VALID_PAGINATION,
    };
    expect(() => projectAutomationListContract.parse(raw)).not.toThrow();
  });

  it("rejects an automation with an unknown action type — z.string() over an enum would silently accept this", () => {
    const raw = {
      data: [{ ...VALID_LIST_ITEM, actions: [{ type: "unknown_type", value: "x" }] }],
      pagination: VALID_PAGINATION,
    };
    expect(() => projectAutomationListContract.parse(raw)).toThrow();
  });

  it("rejects an automation with an unknown triggerEvent — z.string() over an enum would silently accept this", () => {
    const raw = {
      data: [{ ...VALID_LIST_ITEM, triggerEvent: "ticket.unknown_event" }],
      pagination: VALID_PAGINATION,
    };
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
