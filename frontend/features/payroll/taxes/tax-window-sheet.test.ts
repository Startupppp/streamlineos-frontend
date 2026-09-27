import { taxWindowCanSave } from "./tax-window-sheet";

describe("taxWindowCanSave", () => {
  it("blocks a blank year or dates, and a close before the open", () => {
    expect(taxWindowCanSave({ financialYear: "", opensAt: "", closesAt: "" })).toBe(false);
    expect(taxWindowCanSave({ financialYear: "2026-27", opensAt: "2026-04-01", closesAt: "2026-03-01" })).toBe(false);
    expect(taxWindowCanSave({ financialYear: "2026-27", opensAt: "2026-04-01", closesAt: "2026-12-31" })).toBe(true);
  });
});
