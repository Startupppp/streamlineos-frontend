import {
  clearRegisteredQueryCache,
  registerQueryCacheClearer,
} from "./query-cache-control";

describe("query cache control", () => {
  it("clears only the active registered client", () => {
    const first = jest.fn();
    const second = jest.fn();
    const unregisterFirst = registerQueryCacheClearer(first);
    const unregisterSecond = registerQueryCacheClearer(second);

    clearRegisteredQueryCache();
    unregisterFirst();
    clearRegisteredQueryCache();
    unregisterSecond();
    clearRegisteredQueryCache();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(2);
  });
});
