import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue, useFlushableDebouncedValue } from "./use-debounce";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useDebouncedValue", () => {
  it("publishes nothing while the value keeps changing", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    for (const value of ["an", "ann", "anna"]) {
      rerender({ value });
      act(() => void jest.advanceTimersByTime(299));
    }

    expect(result.current).toBe("a");
  });

  it("publishes the last value once the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "anna" });
    act(() => void jest.advanceTimersByTime(300));

    expect(result.current).toBe("anna");
  });
});

describe("useFlushableDebouncedValue", () => {
  it("flush publishes the pending value immediately", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useFlushableDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "anna" });
    expect(result.current[0]).toBe("");

    act(() => result.current[1]());
    expect(result.current[0]).toBe("anna");
  });

  it("flush does not schedule a second publish of a stale value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useFlushableDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "anna" });
    act(() => result.current[1]());
    act(() => void jest.advanceTimersByTime(300));

    expect(result.current[0]).toBe("anna");
  });
});
