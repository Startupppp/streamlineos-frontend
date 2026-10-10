import { computeRiceScore, formatRiceScore, isRiceComplete } from "./rice-formula";

describe("computeRiceScore — RICE formula math (BSN-RICE-MATH)", () => {
  it("computes the correct score for a baseline set of inputs so the server formula matches the live preview", () => {
    const score = computeRiceScore({
      reach: "1200",
      reachPeriod: "quarter",
      impact: 2,
      confidence: 0.8,
      effort: 10,
      effortUnit: "person_days",
    });
    expect(score).not.toBeNull();
    expect(score).toBeCloseTo((1200 / 3) * 2 * 0.8 / 10, 5);
  });

  it("returns null when reach is empty so Unscored is shown instead of a zero score", () => {
    const score = computeRiceScore({
      reach: "",
      reachPeriod: "month",
      impact: 1,
      confidence: 0.5,
      effort: 5,
      effortUnit: "person_days",
    });
    expect(score).toBeNull();
  });

  it("returns null when impact is 0 so a non-impactful entry shows Unscored", () => {
    const score = computeRiceScore({
      reach: "100",
      reachPeriod: "month",
      impact: 0,
      confidence: 0.5,
      effort: 5,
      effortUnit: "person_days",
    });
    expect(score).toBeNull();
  });

  it("returns null when effort is 0 to avoid division by zero", () => {
    const score = computeRiceScore({
      reach: "100",
      reachPeriod: "month",
      impact: 1,
      confidence: 0.5,
      effort: 0,
      effortUnit: "person_days",
    });
    expect(score).toBeNull();
  });

  it("converts person_weeks to days correctly so 2 person-weeks equals 10 person-days in the denominator", () => {
    const weekly = computeRiceScore({
      reach: "120",
      reachPeriod: "month",
      impact: 1,
      confidence: 1,
      effort: 2,
      effortUnit: "person_weeks",
    });
    const daily = computeRiceScore({
      reach: "120",
      reachPeriod: "month",
      impact: 1,
      confidence: 1,
      effort: 10,
      effortUnit: "person_days",
    });
    expect(weekly).toBeCloseTo(daily ?? 0, 5);
  });

  it("converts person_months to days correctly so 1 person-month equals 20 person-days", () => {
    const monthly = computeRiceScore({
      reach: "200",
      reachPeriod: "month",
      impact: 1,
      confidence: 1,
      effort: 1,
      effortUnit: "person_months",
    });
    const daily = computeRiceScore({
      reach: "200",
      reachPeriod: "month",
      impact: 1,
      confidence: 1,
      effort: 20,
      effortUnit: "person_days",
    });
    expect(monthly).toBeCloseTo(daily ?? 0, 5);
  });

  it("scales reach by period so quarterly reach gives lower score than monthly with same input", () => {
    const monthly = computeRiceScore({
      reach: "300",
      reachPeriod: "month",
      impact: 1,
      confidence: 1,
      effort: 5,
      effortUnit: "person_days",
    });
    const quarterly = computeRiceScore({
      reach: "300",
      reachPeriod: "quarter",
      impact: 1,
      confidence: 1,
      effort: 5,
      effortUnit: "person_days",
    });
    expect(monthly).not.toBeNull();
    expect(quarterly).not.toBeNull();
    expect(monthly!).toBeGreaterThan(quarterly!);
  });
});

describe("formatRiceScore — display (BSN-RICE-DISPLAY)", () => {
  it("returns 'Unscored' when score is null so the UI shows a clear label not 0.00", () => {
    expect(formatRiceScore(null)).toBe("Unscored");
  });

  it("formats a numeric score to 2 decimal places so the column aligns correctly", () => {
    expect(formatRiceScore(4.12345)).toBe("4.12");
  });
});

describe("isRiceComplete — completeness guard (BSN-RICE-COMPLETE)", () => {
  it("returns false when reach is empty so the form blocks submission", () => {
    expect(isRiceComplete("", 1, 0.5, "5")).toBe(false);
  });

  it("returns false when impact is null so the form blocks submission", () => {
    expect(isRiceComplete("100", null, 0.5, "5")).toBe(false);
  });

  it("returns false when confidence is null so the form blocks submission", () => {
    expect(isRiceComplete("100", 1, null, "5")).toBe(false);
  });

  it("returns false when effort is 0 so the form blocks submission", () => {
    expect(isRiceComplete("100", 1, 0.5, "0")).toBe(false);
  });

  it("returns true when all required fields are provided and valid so the preview computes", () => {
    expect(isRiceComplete("100", 1, 0.5, "5")).toBe(true);
  });
});
