import {
  recordSignalSchema,
  renewSchema,
  toRenewInput,
  toSignalInput,
} from "./lifecycle-action-schema";
import { describeSweepEntry } from "./lifecycle-format";

describe("lifecycle action forms", () => {
  it("omits blank optionals so the strict body is accepted", () => {
    expect(toSignalInput("lc1", { kind: "note", impact: "", note: "" })).toEqual({
      customerLifecycleId: "lc1",
      kind: "note",
    });
    expect(
      toRenewInput("lc1", { termMonths: "", contractValue: "", startedOn: "", note: "" }, "INR"),
    ).toEqual({ customerLifecycleId: "lc1" });
  });

  it("converts a renewal value to integer minor units", () => {
    expect(
      toRenewInput("lc1", { termMonths: "12", contractValue: "1250.5", startedOn: "2026-11-01", note: "" }, "INR"),
    ).toEqual({
      customerLifecycleId: "lc1",
      termMonths: 12,
      contractValueMinor: 125050,
      startedOn: "2026-11-01",
    });
  });

  it("rejects out-of-range numbers instead of clamping", () => {
    expect(recordSignalSchema.safeParse({ kind: "note", impact: "101", note: "" }).success).toBe(false);
    expect(renewSchema.safeParse({ termMonths: "0", contractValue: "", startedOn: "", note: "" }).success).toBe(false);
  });

  it("describes a refused sweep entry with the loop's reason", () => {
    expect(
      describeSweepEntry({
        customerLifecycleId: "lc1",
        partyId: "p1",
        renewalOn: "2026-12-01",
        action: "opened",
        outcome: "skipped",
        reason: "no contact on file",
        triggerId: "t1",
        opportunityDealId: 4,
        autonomyHoldId: null,
      }),
    ).toContain("no contact on file");
  });
});
