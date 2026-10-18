import { buildAvailableHint } from "./components/leaves-summary-strip";
import { approvedDaysInYear, pendingDaysByLeaveType } from "./leave-date-helpers";

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

  it("shows how the available figure is calculated from the prorated entitlement", () => {
    const joinedThisYear = `${new Date().getFullYear()}-10-15`;
    const hint = buildAvailableHint(
      [{ id: 1, leaveTypeId: 1, typeName: "Casual Leave", balance: "2", daysPerYear: 12 }],
      joinedThisYear,
      false,
    );

    expect(hint).toContain("Casual Leave: 3 entitled (prorated 3/12) − 1 approved = 2 available");
    expect(hint).toContain("3 of 12 months");
    expect(hint).toContain("Pending days are deducted when approved");
  });

  it("HR-U-018 names the pending days per type next to the calculation", () => {
    const year = new Date().getFullYear();
    const pending = pendingDaysByLeaveType(
      [
        { leaveTypeId: 1, status: "PENDING", startDate: `${year}-10-19`, endDate: `${year}-10-19` },
        { leaveTypeId: 2, status: "REJECTED", startDate: `${year}-10-22`, endDate: `${year}-10-22` },
      ],
      year,
    );
    const hint = buildAvailableHint(
      [
        { id: 1, leaveTypeId: 1, typeName: "Casual Leave", balance: "3", daysPerYear: 12 },
        { id: 2, leaveTypeId: 2, typeName: "Sick Leave", balance: "3", daysPerYear: 12 },
      ],
      `${year}-10-14`,
      false,
      pending,
    );

    expect(hint).toContain("Casual Leave: 3 entitled (prorated 3/12) − 0 approved = 3 available (1 pending)");
    expect(hint).toContain("Sick Leave: 3 entitled (prorated 3/12) − 0 approved = 3 available");
    expect(hint).not.toContain("Sick Leave: 3 entitled (prorated 3/12) − 0 approved = 3 available (");
  });

  it("HR-B-014 does not invent a negative approval when the stored balance exceeds the prorated entitlement", () => {
    const year = new Date().getFullYear();
    const hint = buildAvailableHint(
      [{ id: 1, leaveTypeId: 1, typeName: "Casual Leave", balance: "11", daysPerYear: 12 }],
      `${year}-10-14`,
      false,
    );

    expect(hint).toContain("Casual Leave: 11 available");
    expect(hint).not.toContain("entitled");
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
