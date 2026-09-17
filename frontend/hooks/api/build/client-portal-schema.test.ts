import {
  changeRequestRowContract,
  portalChangeRequestItemContract,
  portalChangeRequestListContract,
  toggleVisibilityContract,
} from "./client-portal-schema";

describe("portalChangeRequestItemContract", () => {
  const fullRow = {
    id: 1,
    orgId: "org-1",
    projectId: 42,
    crNumber: 3,
    title: "Add dark mode",
    description: "Please add a dark theme",
    impact: "Medium",
    status: "submitted",
    estimateMinutes: 120,
    budgetImpactCents: 50000,
    timelineImpactDays: 2,
    decisionComment: null,
    requestedById: "user-1",
    approvalOwnerId: "user-2",
    decidedAt: "2026-09-10T00:00:00Z",
    deletedAt: null,
    createdAt: "2026-09-09T00:00:00Z",
    updatedAt: "2026-09-09T00:00:00Z",
  };

  it("accepts the actual client-portal projection with no orgId, projectId, requestedById, approvalOwnerId, decidedAt, deletedAt or updatedAt, so the portal change request list does not crash the screen", () => {
    const portalRow = {
      id: 1,
      crNumber: 3,
      title: "Add dark mode",
      description: "Please add a dark theme",
      impact: "Medium",
      status: "submitted",
      estimateMinutes: 120,
      budgetImpactCents: 50000,
      timelineImpactDays: 2,
      decisionComment: null,
      createdAt: "2026-09-09T00:00:00Z",
    };
    const result = portalChangeRequestListContract.safeParse([portalRow]);
    expect(result.success).toBe(true);
  });

  it("still accepts a change request row that carries every internal field", () => {
    expect(portalChangeRequestItemContract.safeParse(fullRow).success).toBe(true);
  });

  it("rejects a crNumber sent as a string instead of a number", () => {
    expect(portalChangeRequestItemContract.safeParse({ ...fullRow, crNumber: "3" }).success).toBe(false);
  });
});

describe("changeRequestRowContract", () => {
  const internalRow = {
    id: 1,
    orgId: "org-1",
    projectId: 42,
    crNumber: 3,
    title: "Add dark mode",
    description: "Please add a dark theme",
    impact: "Medium",
    estimateMinutes: 120,
    budgetImpactCents: 50000,
    timelineImpactDays: 2,
    status: "submitted",
    requestedById: "user-1",
    approvalOwnerId: null,
    approvalOwnerMembershipId: null,
    decisionComment: null,
    decidedAt: null,
    createdBy: "user-1",
    createdAt: "2026-09-09T00:00:00Z",
    updatedAt: "2026-09-09T00:00:00Z",
    deletedAt: null,
  };

  const portalCreateResponse = {
    id: 1,
    crNumber: 3,
    title: "Add dark mode",
    description: "Please add a dark theme",
    impact: "Medium",
    estimateMinutes: 120,
    budgetImpactCents: 50000,
    timelineImpactDays: 2,
    status: "submitted",
    decisionComment: null,
    createdAt: "2026-09-09T00:00:00Z",
  };

  it("parses the portal submission response through the portal contract, which is the shape that endpoint actually returns", () => {
    expect(portalChangeRequestItemContract.safeParse(portalCreateResponse).success).toBe(true);
  });

  it("keeps the internal row contract strict, so the portal's trimmed shape is rejected there rather than weakening the read path", () => {
    expect(changeRequestRowContract.safeParse(portalCreateResponse).success).toBe(false);
  });

  it("still accepts the full internal change request row returned by the non-portal endpoints", () => {
    expect(changeRequestRowContract.safeParse(internalRow).success).toBe(true);
  });

  it("rejects a budgetImpactCents sent as a string instead of a number", () => {
    expect(changeRequestRowContract.safeParse({ ...internalRow, budgetImpactCents: "50000" }).success).toBe(false);
  });
});

describe("toggleVisibilityContract", () => {
  it("accepts the actual toggle response of id and clientVisible with no success field, filling success in so the mutation's declared return type stays satisfied", () => {
    const result = toggleVisibilityContract.parse({ id: 7, clientVisible: true });
    expect(result).toEqual({ id: 7, clientVisible: true, success: true });
  });

  it("still accepts a response that already carries an explicit success field", () => {
    const result = toggleVisibilityContract.parse({ id: 7, clientVisible: false, success: false });
    expect(result).toEqual({ id: 7, clientVisible: false, success: false });
  });

  it("rejects a clientVisible sent as a string instead of a boolean", () => {
    expect(toggleVisibilityContract.safeParse({ id: 7, clientVisible: "true" }).success).toBe(false);
  });
});
