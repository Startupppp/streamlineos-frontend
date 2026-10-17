import { decidedByLabel } from "@/features/hr/leaves/components/leaves-tab-content";

/**
 * V-046. The status cell printed only the capitalised status, although `my()`
 * already hydrates the approver relation.
 */
describe("decidedByLabel", () => {
  it("a rejected row names the approver", () => {
    expect(decidedByLabel("REJECTED", { name: "Ada Lovelace" })).toBe(
      "Rejected by Ada Lovelace",
    );
  });

  it("an approved row names the approver from first and last name", () => {
    expect(
      decidedByLabel("APPROVED", { name: null, firstName: "Grace", lastName: "Hopper" }),
    ).toBe("Approved by Grace Hopper");
  });

  it("says the bare status rather than 'by Unassigned' when nobody is hydrated", () => {
    expect(decidedByLabel("APPROVED", null)).toBe("Approved");
    expect(decidedByLabel("REJECTED", { name: null })).toBe("Rejected");
  });

  it("leaves an undecided row alone", () => {
    expect(decidedByLabel("PENDING", { name: "Ada Lovelace" })).toBe("Pending");
    expect(decidedByLabel("CANCELLED", { name: "Ada Lovelace" })).toBe("Cancelled");
  });
});
