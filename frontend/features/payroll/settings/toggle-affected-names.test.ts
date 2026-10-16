import { affectedNamesText } from "./toggle-settings-section";

describe("affectedNamesText (UX: PF disable confirm lists affected employees)", () => {
  it("lists the names and counts the ones not named", () => {
    expect(affectedNamesText({ affectedEmployeeCount: 12, affectedEmployeeNames: ["Asha Rao", "Ben Das"] })).toBe(
      "Asha Rao, Ben Das and 10 others",
    );
    expect(affectedNamesText({ affectedEmployeeCount: 3, affectedEmployeeNames: ["A", "B"] })).toBe("A, B and 1 other");
    expect(affectedNamesText({ affectedEmployeeCount: 2, affectedEmployeeNames: ["A", "B"] })).toBe("A, B");
    expect(affectedNamesText({ affectedEmployeeCount: 4, affectedEmployeeNames: [] })).toBe("");
  });
});
