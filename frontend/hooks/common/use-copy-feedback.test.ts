import { act, renderHook } from "@testing-library/react";
import { useCopyFeedback } from "./use-copy-feedback";

const writeText = jest.fn();

describe("useCopyFeedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("clears its reset timer on unmount, so a panel closed inside the feedback window cannot set state after it is gone", async () => {
    const clearSpy = jest.spyOn(global, "clearTimeout");
    const { result, unmount } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await result.current.copy("https://example.test/board");
    });
    expect(result.current.copied).toBe(true);

    unmount();
    expect(clearSpy).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    clearSpy.mockRestore();
  });

  it("returns to the uncopied state once the window passes, so the control does not read as copied forever", async () => {
    const { result } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await result.current.copy("https://example.test/board");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it("reports failure and stays uncopied when the clipboard is unavailable, so the user is not told a copy happened", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useCopyFeedback());

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.copy("https://example.test/board");
    });

    expect(outcome).toBe(false);
    expect(result.current.copied).toBe(false);
  });

  it("restarts the window on a second copy rather than resetting early from the first timer", async () => {
    const { result } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await result.current.copy("one");
    });
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await act(async () => {
      await result.current.copy("two");
    });
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.copied).toBe(true);
  });
});
