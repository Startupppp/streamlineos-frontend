import { blankToUndefined, emptyPolicyDefaults } from "./policy-schema";

describe("the policy sheet stops sending an empty string for an optional numeric, because max_balance is a Postgres numeric and \"\" is 22P02, not a null", () => {
  it("drops a blank max balance", () => {
    expect(blankToUndefined(emptyPolicyDefaults.maxBalance)).toBeUndefined();
  });

  it("drops whitespace the user never meant to type", () => {
    expect(blankToUndefined("  ")).toBeUndefined();
  });

  it("keeps and trims a real value", () => {
    expect(blankToUndefined(" 12.5 ")).toBe("12.5");
  });
});
