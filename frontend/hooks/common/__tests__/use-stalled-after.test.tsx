import { act, renderHook } from "@testing-library/react";
import {
  PANEL_STALLED_AFTER_MS,
  useStalledAfter,
} from "@/hooks/common/use-stalled-after";

/**
 * The 2026-10-01 chat E2E filed three MEDIUM "infinite skeleton" tickets against
 * surfaces whose error branches were correct. They were out of reach: a read
 * against an unreachable API holds `isPending` for up to ~61s (a 30s request
 * deadline, one retry, 1s backoff). This hook is what says so before then.
 */

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useStalledAfter", () => {
  it("is false while the read is inside the threshold", () => {
    const { result } = renderHook(() => useStalledAfter(true, 10_000));

    act(() => {
      jest.advanceTimersByTime(9_999);
    });

    expect(result.current).toBe(false);
  });

  it("turns true once the read has been pending for the threshold", () => {
    const { result } = renderHook(() => useStalledAfter(true, 10_000));

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current).toBe(true);
  });

  it("never fires for a read that was never active", () => {
    const { result } = renderHook(() => useStalledAfter(false, 10_000));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(false);
  });

  it("clears when the read settles, so the next slow read is judged on its own", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useStalledAfter(active, 10_000),
      { initialProps: { active: true } },
    );

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);

    rerender({ active: true });
    expect(result.current).toBe(false);
    act(() => {
      jest.advanceTimersByTime(9_999);
    });
    expect(result.current).toBe(false);
  });

  it("fires well inside the ~61s a failed read can take to report an error", () => {
    expect(PANEL_STALLED_AFTER_MS).toBeLessThan(30_000);
  });
});
