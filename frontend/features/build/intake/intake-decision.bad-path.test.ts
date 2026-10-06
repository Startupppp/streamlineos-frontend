import { intakeDecisionSchema, createIntakeSchema } from "./intake-schema";

describe("intake accept/decline — bad paths first", () => {
  it("rejects accept without a state", () => {
    expect(
      intakeDecisionSchema.safeParse({ action: "accept", state: "" }).success,
    ).toBe(false);
  });

  it("rejects decline without a reason", () => {
    expect(
      intakeDecisionSchema.safeParse({ action: "decline", reason: "" }).success,
    ).toBe(false);
  });

  it("rejects create intake with an empty title", () => {
    expect(createIntakeSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("accepts decline with a reason on the happy path", () => {
    expect(
      intakeDecisionSchema.safeParse({
        action: "decline",
        reason: "Out of scope",
      }).success,
    ).toBe(true);
  });

  it("accepts accept with a state on the happy path", () => {
    expect(
      intakeDecisionSchema.safeParse({
        action: "accept",
        state: "TODO",
      }).success,
    ).toBe(true);
  });
});
