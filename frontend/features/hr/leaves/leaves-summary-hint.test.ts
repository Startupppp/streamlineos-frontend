import { buildAvailableHint } from "./components/leaves-summary-strip";

describe("the available-days hint distinguishes an unconfigured organisation from a spent balance, because both render as 0", () => {
  it("says no policy is set up when the employee holds no balances at all", () => {
    expect(buildAvailableHint([], null)).toBe(
      "No leave policy is set up yet, so nothing has accrued — an HR admin can add leave types under Leave settings.",
    );
  });

  it("breaks the total down per leave type once policies exist", () => {
    const hint = buildAvailableHint(
      [
        { typeName: "Casual Leave", balance: 12 },
        { typeName: "Sick Leave", balance: 0 },
      ] as never,
      null,
    );

    expect(hint).toContain("Casual Leave");
    expect(hint).toContain("Sick Leave");
    expect(hint).not.toContain("No leave policy is set up yet");
  });
});
