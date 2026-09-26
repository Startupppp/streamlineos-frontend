import {
  workflowTransitionContract,
  workflowTransitionListContract,
  projectStatusContract,
} from "./workflow-schema";

const validTransition = {
  id: 1,
  orgId: "org-abc",
  projectId: 10,
  fromStatusId: null,
  toStatusId: 2,
  name: "Start work",
  requiresApproval: false,
  requiredFields: [],
  allowedRoles: [],
  createdByMembershipId: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
  deletedAt: null,
};

const validStatus = {
  id: 1,
  orgId: "org-abc",
  projectId: 10,
  name: "In Progress",
  order: 2,
  color: "#3b82f6",
  type: "started",
  wipLimit: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

describe("workflowTransitionContract (BLD-X-BE-SETTINGS-WORKFLOW-001)", () => {
  it("accepts a valid transition with null fromStatusId and null createdByMembershipId", () => {
    expect(workflowTransitionContract.safeParse(validTransition).success).toBe(true);
  });

  it("accepts a transition with a numeric fromStatusId", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, fromStatusId: 1 }).success
    ).toBe(true);
  });

  it("rejects a transition missing toStatusId", () => {
    const { toStatusId: _toStatusId, ...withoutToStatusId } = validTransition;
    expect(workflowTransitionContract.safeParse(withoutToStatusId).success).toBe(false);
  });

  it("accepts fromStatusId as null — wildcard source transition", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, fromStatusId: null }).success
    ).toBe(true);
  });

  it("accepts empty requiredFields array", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, requiredFields: [] }).success
    ).toBe(true);
  });

  it("accepts requiredFields with values", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, requiredFields: ["priority", "assignee"] }).success
    ).toBe(true);
  });

  it("accepts empty allowedRoles array", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, allowedRoles: [] }).success
    ).toBe(true);
  });

  it("accepts allowedRoles with string values", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, allowedRoles: ["admin", "member"] }).success
    ).toBe(true);
  });

  it("rejects a transition where requiresApproval is a string instead of boolean", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, requiresApproval: "true" }).success
    ).toBe(false);
  });

  it("accepts deletedAt as null", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, deletedAt: null }).success
    ).toBe(true);
  });

  it("accepts deletedAt as a date string", () => {
    expect(
      workflowTransitionContract.safeParse({ ...validTransition, deletedAt: "2024-08-01T00:00:00.000Z" }).success
    ).toBe(true);
  });

  it("rejects a transition missing orgId", () => {
    const { orgId: _orgId, ...withoutOrgId } = validTransition;
    expect(workflowTransitionContract.safeParse(withoutOrgId).success).toBe(false);
  });
});

describe("workflowTransitionListContract (BLD-X-BE-SETTINGS-WORKFLOW-002)", () => {
  it("accepts an empty array", () => {
    expect(workflowTransitionListContract.safeParse([]).success).toBe(true);
  });

  it("accepts an array with a valid transition", () => {
    expect(workflowTransitionListContract.safeParse([validTransition]).success).toBe(true);
  });

  it("rejects a non-array", () => {
    expect(workflowTransitionListContract.safeParse(validTransition).success).toBe(false);
  });

  it("rejects an array containing a transition with missing toStatusId", () => {
    const { toStatusId: _toStatusId, ...withoutToStatusId } = validTransition;
    expect(workflowTransitionListContract.safeParse([withoutToStatusId]).success).toBe(false);
  });
});

describe("projectStatusContract (BLD-X-BE-SETTINGS-WORKFLOW-003)", () => {
  it("accepts a valid status row", () => {
    expect(projectStatusContract.safeParse(validStatus).success).toBe(true);
  });

  it("rejects an unknown type — stateGroupEnum guard prevents non-member values from passing", () => {
    expect(
      projectStatusContract.safeParse({ ...validStatus, type: "UNKNOWN_STATE_TYPE" }).success
    ).toBe(false);
  });

  it("accepts all valid stateGroupEnum values", () => {
    const validTypes = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;
    for (const type of validTypes) {
      expect(
        projectStatusContract.safeParse({ ...validStatus, type }).success
      ).toBe(true);
    }
  });

  it("accepts null color", () => {
    expect(
      projectStatusContract.safeParse({ ...validStatus, color: null }).success
    ).toBe(true);
  });

  it("accepts null wipLimit", () => {
    expect(
      projectStatusContract.safeParse({ ...validStatus, wipLimit: null }).success
    ).toBe(true);
  });

  it("accepts a numeric wipLimit", () => {
    expect(
      projectStatusContract.safeParse({ ...validStatus, wipLimit: 5 }).success
    ).toBe(true);
  });

  it("rejects a status missing name", () => {
    const { name: _name, ...withoutName } = validStatus;
    expect(projectStatusContract.safeParse(withoutName).success).toBe(false);
  });

  it("rejects a status missing projectId", () => {
    const { projectId: _projectId, ...withoutProjectId } = validStatus;
    expect(projectStatusContract.safeParse(withoutProjectId).success).toBe(false);
  });

  it("rejects a status missing type", () => {
    const { type: _type, ...withoutType } = validStatus;
    expect(projectStatusContract.safeParse(withoutType).success).toBe(false);
  });
});

describe("workflow cache key contract (BLD-X-BE-SETTINGS-WF-004)", () => {
  it("workflow transitions key includes projectId", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.workflow.transitions(10);
    expect(key).toContain(10);
  });

  it("workflow transitions key contains 'transitions' segment", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.workflow.transitions(10);
    expect(key.some((s: unknown) => s === "transitions")).toBe(true);
  });

  it("two different projectIds produce different workflow cache keys", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.workflow.transitions(1);
    const key2 = buildWorkQueryKeys.projects.workflow.transitions(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });
});
