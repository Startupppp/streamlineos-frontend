import { UNKNOWN_WARNING_SENTENCE, describeReportingWarning, describeReportingWarnings } from "./reporting-line-warnings";

describe("reporting-line warning sentences", () => {
  it.each(["PRIMARY_CHANGE_THRESHOLD_EXCEEDED", "EMERGENCY_OVERRIDE", "FALLBACK_ASSIGNED"])("turns %s into a sentence, never the code", (code) => {
    const sentence = describeReportingWarning(code);
    expect(sentence).not.toContain(code);
    expect(sentence).not.toBe(UNKNOWN_WARNING_SENTENCE);
    expect(sentence).toMatch(/\.$/);
  });

  it("gives an unknown code a readable default", () => {
    expect(describeReportingWarning("SOMETHING_NEW")).toBe(UNKNOWN_WARNING_SENTENCE);
  });

  it("says each distinct sentence once", () => {
    expect(describeReportingWarnings(["A_NEW_ONE", "ANOTHER_NEW_ONE", "EMERGENCY_OVERRIDE"])).toHaveLength(2);
  });
});
