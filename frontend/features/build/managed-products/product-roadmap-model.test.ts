import { positiveFilterId } from "./product-roadmap-model";

describe("positiveFilterId", () => {
  it("keeps a positive integer id", () => {
    expect(positiveFilterId("35")).toBe(35);
  });

  it("drops blank, zero, negative, and non-numeric ids", () => {
    expect(positiveFilterId("")).toBeUndefined();
    expect(positiveFilterId("0")).toBeUndefined();
    expect(positiveFilterId("-1")).toBeUndefined();
    expect(positiveFilterId("not-a-team")).toBeUndefined();
    expect(positiveFilterId("12abc")).toBeUndefined();
  });
});
