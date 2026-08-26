import { accessState, resolveGate, type GateInput } from "./gate";

const LOADED: GateInput = {
  access: "granted",
  isLoading: false,
  isError: false,
  isEmpty: false,
};

describe("resolveGate", () => {
  /**
   * The defect, stated as a test.
   *
   * A denied query in TanStack Query v5 reports `isPending: true,
   * isFetching: false` -- so `isLoading` is false and the rows are absent. Those
   * are exactly the flags an empty list has, which is how a rep who cannot see
   * the pipeline was told the pipeline was empty.
   */
  it("says denied, not empty, for a query that was never allowed to run", () => {
    expect(
      resolveGate({ access: "denied", isLoading: false, isError: false, isEmpty: true }),
    ).toBe("denied");
  });

  /**
   * The second lie, which fixing only the first would have introduced.
   *
   * `useCan` answers false while the access response is in flight, so a screen
   * branching on it shows every user -- including one who holds the permission
   * -- a flash of "Access Restricted" before their own rights arrive.
   */
  it("says loading, not denied, before the caller's rights are known", () => {
    expect(
      resolveGate({ access: "loading", isLoading: false, isError: false, isEmpty: true }),
    ).toBe("loading");
  });

  it("does not let a denied query's flags reach the error branch either", () => {
    // A refused request carries whatever defaults it was constructed with.
    expect(
      resolveGate({ access: "denied", isLoading: true, isError: true, isEmpty: false }),
    ).toBe("denied");
  });

  it("reports emptiness only once something has actually looked", () => {
    expect(resolveGate({ ...LOADED, isEmpty: true })).toBe("empty");
    expect(resolveGate({ ...LOADED, isLoading: true, isEmpty: true })).toBe("loading");
  });

  it("prefers an error to an empty result, so a failure is not read as no data", () => {
    expect(resolveGate({ ...LOADED, isError: true, isEmpty: true })).toBe("error");
  });

  it("shows the data when there is data and the caller may see it", () => {
    expect(resolveGate(LOADED)).toBe("ready");
  });
});

describe("accessState", () => {
  it("distinguishes not-known-yet from known-and-refused", () => {
    expect(accessState({ isLoading: true, granted: false })).toBe("loading");
    expect(accessState({ isLoading: false, granted: false })).toBe("denied");
    expect(accessState({ isLoading: false, granted: true })).toBe("granted");
  });

  /**
   * The one that would otherwise be tempting to simplify away.
   *
   * A caller could compute "granted" from the presence of the permission alone
   * and let the loading flag fall out of `!data`. That is the original bug in
   * miniature: it makes a still-loading response indistinguishable from a
   * refusal, which is the whole thing being separated here.
   */
  it("reports loading even when the permission is absent from what has arrived", () => {
    expect(accessState({ isLoading: true, granted: false })).not.toBe("denied");
  });
});
