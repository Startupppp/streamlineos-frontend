import { buildAvailableHint } from "./components/leaves-summary-strip";
import { approvedDaysInYear } from "./leave-date-helpers";

/**
 * V-045. This suite used to agree with the bug: it asserted the no-policy copy
 * for "no balances at all", which is also true of a configured 12-day policy
 * nobody has used. The copy now keys on whether a leave type is configured.
 */
describe("the available-days hint distinguishes an unconfigured organisation from a spent balance, because both render as 0", () => {
  it("says no policy is set up only when no leave type is configured", () => {
    expect(buildAvailableHint([], null, true)).toBe(
      "No leave policy is set up yet, so nothing has accrued — an HR admin can add leave types under Leave settings.",
    );
  });

  it("never says no policy is set up for a configured policy nobody has used", () => {
    expect(buildAvailableHint([], null, false) ?? "").not.toContain(
      "No leave policy is set up yet",
    );
  });

  it("breaks the total down per leave type once policies exist", () => {
    const hint = buildAvailableHint(
      [
        { typeName: "Casual Leave", balance: 12 },
        { typeName: "Sick Leave", balance: 0 },
      ] as never,
      null,
      false,
    );

    expect(hint).toContain("Casual Leave");
    expect(hint).toContain("Sick Leave");
    expect(hint).not.toContain("No leave policy is set up yet");
  });
});

describe('V-045. "Approved (YTD)" counts days, not requests', () => {
  const year = 2026;

  it("counts the workdays of each approved request, not the request", () => {
    // One request, Mon 2026-09-21 → Fri 2026-09-25: five days, one row.
    expect(
      approvedDaysInYear(
        [
          {
            status: "APPROVED",
            startDate: "2026-09-21",
            endDate: "2026-09-25",
          },
        ],
        year,
      ),
    ).toBe(5);
  });

  it("ignores requests that are not approved and halves a half day", () => {
    expect(
      approvedDaysInYear(
        [
          { status: "PENDING", startDate: "2026-09-21", endDate: "2026-09-25" },
          { status: "REJECTED", startDate: "2026-09-21", endDate: "2026-09-21" },
          {
            status: "APPROVED",
            startDate: "2026-09-21",
            endDate: "2026-09-21",
            isHalfDay: true,
          },
        ],
        year,
      ),
    ).toBe(0.5);
  });

  it("clamps a request spanning new year to the year asked for", () => {
    expect(
      approvedDaysInYear(
        [
          {
            status: "APPROVED",
            startDate: "2025-12-29",
            endDate: "2026-01-02",
          },
        ],
        year,
      ),
    ).toBe(2); // 1 and 2 Jan 2026 are Thu and Fri
  });
});
