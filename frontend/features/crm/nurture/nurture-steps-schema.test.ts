import { MAX_SEQUENCE_STEPS, MAX_STEP_WAIT_HOURS, MIN_STEP_WAIT_HOURS } from "@/types/crm/nurture";
import { nurtureStepsSchema, toReplaceStepsInput } from "./nurture-steps-schema";

const step = (waitHours: string) => ({ waitHours });

function firstError(steps: { waitHours: string }[]): string | undefined {
  const result = nurtureStepsSchema.safeParse({ steps });
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("nurtureStepsSchema", () => {
  it("accepts whole hours inside the wire's range", () => {
    expect(nurtureStepsSchema.safeParse({ steps: [step("240"), step("720")] }).success).toBe(true);
    expect(nurtureStepsSchema.safeParse({ steps: [step("0")] }).success).toBe(true);
    expect(
      nurtureStepsSchema.safeParse({ steps: [step(String(MAX_STEP_WAIT_HOURS))] }).success,
    ).toBe(true);
  });

  it("accepts a wait under the floor, because the server clamps rather than refuses", () => {
    expect(nurtureStepsSchema.safeParse({ steps: [step("1")] }).success).toBe(true);
    expect(
      nurtureStepsSchema.safeParse({ steps: [step(String(MIN_STEP_WAIT_HOURS - 1))] }).success,
    ).toBe(true);
  });

  it("refuses a decimal, which the wire schema would 400 on", () => {
    expect(firstError([step("12.5")])).toBe("Whole hours only — no decimals, no minus sign");
  });

  it("refuses a negative wait", () => {
    expect(firstError([step("-5")])).toBe("Whole hours only — no decimals, no minus sign");
  });

  it("refuses anything that is not a number at all", () => {
    expect(firstError([step("soon")])).toBe("Whole hours only — no decimals, no minus sign");
    expect(firstError([step("1e3")])).toBe("Whole hours only — no decimals, no minus sign");
  });

  it("refuses an empty field with its own message", () => {
    expect(firstError([step("")])).toBe("Enter how long to wait");
  });

  it("refuses a wait past ninety days", () => {
    expect(firstError([step(String(MAX_STEP_WAIT_HOURS + 1))])).toContain("at most");
  });

  it("refuses more steps than a sequence may hold", () => {
    const tooMany = Array.from({ length: MAX_SEQUENCE_STEPS + 1 }, () => step("240"));
    expect(firstError(tooMany)).toContain(String(MAX_SEQUENCE_STEPS));
  });

  it("accepts exactly the step limit", () => {
    const atLimit = Array.from({ length: MAX_SEQUENCE_STEPS }, () => step("240"));
    expect(nurtureStepsSchema.safeParse({ steps: atLimit }).success).toBe(true);
  });

  it("accepts an empty cadence", () => {
    expect(nurtureStepsSchema.safeParse({ steps: [] }).success).toBe(true);
  });
});

describe("toReplaceStepsInput", () => {
  it("sends numbers, and nothing but the wait", () => {
    expect(toReplaceStepsInput({ steps: [step("240"), step("480")] })).toEqual({
      steps: [{ waitHours: 240 }, { waitHours: 480 }],
    });
  });

  it("carries no step number", () => {
    const [first] = toReplaceStepsInput({ steps: [step("240")] }).steps;
    expect(Object.keys(first ?? {})).toEqual(["waitHours"]);
  });
});
