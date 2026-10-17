import { testCaseSchema, testRunSchema } from "./qa-schema";

describe("testCaseSchema — whitespace-only title persists to the server until trim+min", () => {
  it("rejects whitespace-only title", () => {
    const result = testCaseSchema.safeParse({
      title: "   ",
      suiteId: "none",
      preconditions: "",
      steps: [],
      expectedResult: "",
      priority: "medium",
      automationStatus: "manual",
      component: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-blank title", () => {
    const result = testCaseSchema.safeParse({
      title: "  Login with valid credentials  ",
      suiteId: "none",
      preconditions: "",
      steps: [],
      expectedResult: "",
      priority: "medium",
      automationStatus: "manual",
      component: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("testRunSchema — whitespace-only name persists to the server until trim+min", () => {
  it.each([[], [0], [-1], [1.5], [2, 2], ["2"]].map((caseIds) => [caseIds]))("refuses invalid Cases-mode selection %j", (caseIds) => {
    const result = testRunSchema.safeParse({ name: "Regression", environment: "", browserDevice: "", testerId: "", suiteId: "none", mode: "cases", caseIds });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "caseIds")).toBe(true);
  });
  it.each(["suite", "cases"])("accepts intentional %s selection", (mode) => {
    expect(testRunSchema.safeParse({ name: "Regression", environment: "", browserDevice: "", testerId: "", suiteId: "none", mode, caseIds: mode === "cases" ? [42] : [] }).success).toBe(true);
  });
  it("rejects whitespace-only name", () => {
    const result = testRunSchema.safeParse({
      name: "   ",
      environment: "",
      browserDevice: "",
      testerId: "",
      suiteId: "none",
      mode: "suite", caseIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-blank name", () => {
    const result = testRunSchema.safeParse({
      name: "Sprint 12 regression",
      environment: "",
      browserDevice: "",
      testerId: "",
      suiteId: "none",
      mode: "suite", caseIds: [],
    });
    expect(result.success).toBe(true);
  });
});
