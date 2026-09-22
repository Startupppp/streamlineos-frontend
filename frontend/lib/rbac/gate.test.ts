import { accessState } from "./gate";

describe("accessState", () => {
  it("distinguishes not-known-yet from known-and-refused", () => {
    expect(accessState({ isLoading: true, granted: false })).toBe("loading");
    expect(accessState({ isLoading: false, granted: false })).toBe("denied");
    expect(accessState({ isLoading: false, granted: true })).toBe("granted");
  });

  it("reports loading even when the permission is absent from what has arrived, because deriving granted from presence alone makes a pending response indistinguishable from a refusal", () => {
    expect(accessState({ isLoading: true, granted: false })).not.toBe("denied");
  });
});
