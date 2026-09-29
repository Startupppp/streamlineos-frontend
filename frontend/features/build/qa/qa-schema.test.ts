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
  it("rejects whitespace-only name", () => {
    const result = testRunSchema.safeParse({
      name: "   ",
      environment: "",
      browserDevice: "",
      testerId: "",
      suiteId: "none",
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
    });
    expect(result.success).toBe(true);
  });
});
