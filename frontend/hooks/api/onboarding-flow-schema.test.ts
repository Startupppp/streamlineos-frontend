import {
  moduleChecklistListContract,
  moduleChecklistRowContract,
  onboardingFlowSessionContract,
} from "./onboarding-flow-schema";

describe("onboarding session wire contract", () => {
  const initial = {
    id: 0,
    orgId: "org-a",
    userId: "user-a",
    membershipId: 17,
    type: "employee_onboarding",
    status: "not_started",
    currentStep: null,
    completedSteps: [],
    skippedSteps: [],
    data: {},
    source: null,
    startedAt: null,
    completedAt: null,
  };

  it("accepts an unsaved initial session without durable timestamps", () => {
    expect(onboardingFlowSessionContract.safeParse(initial).success).toBe(true);
  });

  it("requires durable timestamps for a persisted session", () => {
    expect(onboardingFlowSessionContract.safeParse({ ...initial, id: 5 }).success).toBe(false);
  });
});

describe("module checklist wire contract", () => {
  const item = {
    id: 10,
    orgId: "org-a",
    checklistId: 4,
    itemKey: "create_project",
    title: "Create a project",
    description: null,
    actionHref: "/build/projects",
    status: "todo",
    required: true,
    sortOrder: 0,
    completedAt: null,
    skippedAt: null,
  };
  const persisted = {
    id: 4,
    orgId: "org-a",
    moduleKey: "build",
    status: "in_progress",
    progress: 50,
    dismissedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [item],
  };

  it("accepts persisted rows and projected seed items with their parent checklist ID", () => {
    const projected = {
      ...item,
      id: null,
      itemKey: "invite_team",
      completedAt: null,
      skippedAt: null,
    };

    expect(moduleChecklistListContract.safeParse([{ ...persisted, items: [item, projected] }]).success).toBe(true);
    expect(moduleChecklistRowContract.safeParse(persisted).success).toBe(true);
  });

  it("accepts an unsaved checklist without pretending that its IDs or timestamps are durable", () => {
    const virtual = {
      ...persisted,
      id: null,
      createdAt: null,
      updatedAt: null,
      completedAt: null,
      dismissedAt: null,
      items: [{ ...item, id: null, checklistId: null }],
    };

    expect(moduleChecklistListContract.safeParse([virtual]).success).toBe(true);
    expect(moduleChecklistRowContract.safeParse(virtual).success).toBe(false);
  });

  it("rejects virtual parents with durable items and persisted parents without timestamps", () => {
    expect(moduleChecklistListContract.safeParse([{
      ...persisted,
      id: null,
      createdAt: null,
      updatedAt: null,
      items: [item],
    }]).success).toBe(false);
    expect(moduleChecklistListContract.safeParse([{ ...persisted, createdAt: null }]).success).toBe(false);
  });

  it("rejects item ownership mismatches and unknown statuses", () => {
    expect(moduleChecklistListContract.safeParse([{ ...persisted, items: [{ ...item, checklistId: 99 }] }]).success).toBe(false);
    expect(moduleChecklistListContract.safeParse([{ ...persisted, items: [{ ...item, orgId: "org-b" }] }]).success).toBe(false);
    expect(moduleChecklistListContract.safeParse([{ ...persisted, status: "paused" }]).success).toBe(false);
    expect(moduleChecklistListContract.safeParse([{ ...persisted, items: [{ ...item, status: "unknown" }] }]).success).toBe(false);
  });
});
