import { computeRiceScore, formatRiceScore, formatStoredRiceScore } from "./rice-formula";

describe("computeRiceScore — RICE formula math (BSN-RICE-MATH)", () => {
  it("computes reach × impact × confidence ÷ effort so the live preview equals the score the server stores", () => {
    const score = computeRiceScore({ reach: "1200", impact: 2, confidence: 0.8, effort: 10 });
    expect(score).toBeCloseTo((1200 * 2 * 0.8) / 10, 5);
  });

  it("returns null when reach is empty so Unscored is shown instead of a zero score", () => {
    expect(computeRiceScore({ reach: "", impact: 1, confidence: 0.5, effort: 5 })).toBeNull();
  });

  it("returns null when impact is 0 so a non-impactful entry shows Unscored", () => {
    expect(computeRiceScore({ reach: "100", impact: 0, confidence: 0.5, effort: 5 })).toBeNull();
  });

  it("returns null when effort is 0 to avoid division by zero", () => {
    expect(computeRiceScore({ reach: "100", impact: 1, confidence: 0.5, effort: 0 })).toBeNull();
  });

  it("returns null when confidence is above 1 so an out-of-range confidence never previews a score", () => {
    expect(computeRiceScore({ reach: "100", impact: 1, confidence: 1.5, effort: 5 })).toBeNull();
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

describe("formatStoredRiceScore — server numeric strings", () => {
  it("shows the server's four-decimal numeric as two decimals", () => {
    expect(formatStoredRiceScore("400.0000")).toBe("400.00");
  });

  it("shows Unscored for a missing or non-numeric stored score", () => {
    expect(formatStoredRiceScore(null)).toBe("Unscored");
    expect(formatStoredRiceScore(undefined)).toBe("Unscored");
    expect(formatStoredRiceScore("")).toBe("Unscored");
    expect(formatStoredRiceScore("n/a")).toBe("Unscored");
  });
});
