import { humanWithdrawalReason } from "./linked-document-withdrawal";

describe("humanWithdrawalReason", () => {
  it("gives back what a person wrote", () => {
    expect(humanWithdrawalReason("Superseded by the 2026 handbook")).toBe("Superseded by the 2026 handbook");
    expect(humanWithdrawalReason("  spaced  ")).toBe("spaced");
  });

  it("gives back nothing for the server's own codes, which no person wrote", () => {
    expect(humanWithdrawalReason("manual")).toBeNull();
    expect(humanWithdrawalReason("source_no_longer_publishable")).toBeNull();
  });

  it("gives back nothing when there is no reason", () => {
    expect(humanWithdrawalReason(null)).toBeNull();
    expect(humanWithdrawalReason("   ")).toBeNull();
  });
});
