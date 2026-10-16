import { act, renderHook } from "@testing-library/react";
import { useSubmitGuard } from "./use-submit-guard";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useSubmitGuard", () => {
  it("runs the handler once for two rapid submits, so a double-click cannot create two records", async () => {
    const gate = deferred<void>();
    const handler = jest.fn(() => gate.promise);
    const { result } = renderHook(() => useSubmitGuard(handler));

    act(() => {
      void result.current.submit();
      void result.current.submit();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("latches synchronously before the first await, so a second click in the same tick is ignored", () => {
    const handler = jest.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => useSubmitGuard(handler));

    act(() => {
      void result.current.submit();
      expect(result.current.isInFlight()).toBe(true);
      void result.current.submit();
      void result.current.submit();
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("re-opens after a rejected submit, so the user can retry a failed save", async () => {
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSubmitGuard(handler));

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow("boom");
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isInFlight()).toBe(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("passes its arguments through to the handler", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSubmitGuard(handler));

    await act(async () => {
      await result.current.submit({ name: "Portfolio A" });
    });

    expect(handler).toHaveBeenCalledWith({ name: "Portfolio A" });
  });

  it("does not set state after unmount, so a dialog closed mid-flight logs no warning", async () => {
    const gate = deferred<void>();
    const handler = jest.fn(() => gate.promise);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useSubmitGuard(handler));

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.submit();
    });
    unmount();

    await act(async () => {
      gate.resolve();
      await pending;
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
