import { titleCaseLabel } from "@/lib/title-case";

describe("titleCaseLabel", () => {
  it("capitalises every word of an all-lowercase label", () => {
    expect(titleCaseLabel("morning shift")).toBe("Morning Shift");
  });

  it("leaves an initialism alone instead of lowercasing its tail", () => {
    expect(titleCaseLabel("2nd shift IST")).toBe("2nd Shift IST");
  });

  it("leaves an internal capital alone", () => {
    expect(titleCaseLabel("McDonald's crew")).toBe("McDonald's Crew");
    expect(titleCaseLabel("iOS rollout")).toBe("iOS Rollout");
  });

  it("capitalises after a hyphen", () => {
    expect(titleCaseLabel("night-owl shift")).toBe("Night-Owl Shift");
  });

  it("does not capitalise after an apostrophe", () => {
    expect(titleCaseLabel("o'clock club")).toBe("O'clock Club");
    expect(titleCaseLabel("o’clock club")).toBe("O’clock Club");
  });

  it("leaves a digit-leading word unchanged rather than dropping it", () => {
    expect(titleCaseLabel("2nd")).toBe("2nd");
  });

  it("collapses whitespace without altering letter case elsewhere", () => {
    expect(titleCaseLabel("  general   SHIFT  ")).toBe("General SHIFT");
  });

  it("returns an empty string for blank input", () => {
    expect(titleCaseLabel("")).toBe("");
    expect(titleCaseLabel("   ")).toBe("");
  });
});
