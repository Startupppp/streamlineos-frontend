import { describeDraftResult } from "./fill-from-clock";
import type { AttendanceDraftResult } from "@/features/timesheets/types";

function result(over: Partial<AttendanceDraftResult> = {}): AttendanceDraftResult {
  return {
    enabled: true,
    segmentsFound: 0,
    entriesCreated: 0,
    skippedExisting: 0,
    skippedEmpty: 0,
    periodIds: [],
    ...over,
  };
}

describe("what a draft-from-attendance result means", () => {
  it("says the policy is off rather than reporting zero entries", () => {
    const { tone, headline, detail } = describeDraftResult(result({ enabled: false }));

    expect(tone).toBe("info");
    expect(headline).toMatch(/switched off/i);
    expect(headline).not.toMatch(/\b0\b/);
    expect(detail).toMatch(/nothing was read/i);
  });

  it("distinguishes an empty week from a week already logged", () => {
    const empty = describeDraftResult(result({ segmentsFound: 0 }));
    const logged = describeDraftResult(result({ segmentsFound: 5, skippedExisting: 5 }));

    expect(empty.headline).toMatch(/no completed clock days/i);
    expect(logged.headline).toMatch(/nothing new/i);
    expect(logged.detail).toMatch(/already had an entry/i);
    expect(empty.headline).not.toBe(logged.headline);
  });

  it("names why nothing was created when days were clocked", () => {
    const { detail } = describeDraftResult(
      result({ segmentsFound: 4, skippedExisting: 3, skippedEmpty: 1 }),
    );

    expect(detail).toContain("3 already had an entry");
    expect(detail).toContain("1 produced no usable hours");
  });

  it("reports what it created, and skipped days are not failures", () => {
    const { tone, headline, detail } = describeDraftResult(
      result({ segmentsFound: 5, entriesCreated: 3, skippedExisting: 2 }),
    );

    expect(tone).toBe("success");
    expect(headline).toContain("3 draft entries");
    expect(detail).toMatch(/skipped 2 already logged/i);
  });

  it("says one entry rather than 1 entries", () => {
    expect(describeDraftResult(result({ segmentsFound: 1, entriesCreated: 1 })).headline).toBe(
      "1 draft entry created from your clock",
    );
  });
});
