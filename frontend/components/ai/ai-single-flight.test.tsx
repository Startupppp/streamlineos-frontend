import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { AiActionResult } from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";
import { useAiInlineAction } from "./use-ai-inline-action";
import { useAiPopoverAction } from "./use-ai-popover-action";

interface Deferred {
  promise: Promise<AiActionResult>;
  resolve: (value: AiActionResult) => void;
  reject: (error: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: (value: AiActionResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<AiActionResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAiInlineAction — one paid dispatch at a time", () => {
  it("refuses a retry issued while the first run is still in flight", async () => {
    const pending = deferred();
    const run = jest.fn(() => pending.promise);
    const sessions: (AiInlineSession | null)[] = [];

    const { result } = renderHook(() =>
      useAiInlineAction({
        actionKey: "improve",
        run,
        onApply: jest.fn(),
        onSessionChange: (session) => sessions.push(session),
      }),
    );

    act(() => {
      void result.current.run();
    });
    expect(run).toHaveBeenCalledTimes(1);

    const loading = sessions[sessions.length - 1];
    expect(loading?.state.status).toBe("loading");

    act(() => {
      loading?.retry();
      loading?.retry();
      void result.current.run();
    });

    expect(run).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ text: "done" });
      await pending.promise;
    });

    const settled = sessions[sessions.length - 1];
    expect(settled?.state.status).toBe("ready");
  });

  it("forwards an AbortSignal and cancels without waiting for the promise", async () => {
    const pending = deferred();
    let seen: AbortSignal | undefined;
    const run = jest.fn((signal?: AbortSignal) => {
      seen = signal;
      return pending.promise;
    });
    const sessions: (AiInlineSession | null)[] = [];

    const { result } = renderHook(() =>
      useAiInlineAction({
        actionKey: "improve",
        run,
        onApply: jest.fn(),
        onSessionChange: (session) => sessions.push(session),
      }),
    );

    act(() => {
      void result.current.run();
    });
    expect(seen).toBeInstanceOf(AbortSignal);
    expect(seen?.aborted).toBe(false);

    act(() => {
      result.current.cancel();
    });

    expect(seen?.aborted).toBe(true);
    expect(sessions[sessions.length - 1]?.state.status).toBe("cancelled");
  });

  it("discards the answer of a run the user already cancelled", async () => {
    const pending = deferred();
    const run = jest.fn(() => pending.promise);
    const sessions: (AiInlineSession | null)[] = [];

    const { result } = renderHook(() =>
      useAiInlineAction({
        actionKey: "improve",
        run,
        onApply: jest.fn(),
        onSessionChange: (session) => sessions.push(session),
      }),
    );

    act(() => {
      void result.current.run();
    });
    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      pending.resolve({ text: "answer nobody is waiting for" });
      await pending.promise;
    });

    expect(sessions[sessions.length - 1]?.state.status).toBe("cancelled");
  });

  it("lets the user retry after a cancellation the run never observed", async () => {
    const first = deferred();
    const second = deferred();
    const run = jest
      .fn<Promise<AiActionResult>, [AbortSignal?]>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const sessions: (AiInlineSession | null)[] = [];

    const { result } = renderHook(() =>
      useAiInlineAction({
        actionKey: "improve",
        run,
        onApply: jest.fn(),
        onSessionChange: (session) => sessions.push(session),
      }),
    );

    act(() => {
      void result.current.run();
    });
    act(() => {
      result.current.cancel();
    });
    act(() => {
      void result.current.run();
    });

    expect(run).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ text: "second answer" });
      await second.promise;
    });

    const settled = sessions[sessions.length - 1];
    expect(settled?.state.status).toBe("ready");
    if (settled?.state.status === "ready")
      expect(settled.state.result.text).toBe("second answer");
  });

  it("aborts an abandoned run when the component unmounts", () => {
    const pending = deferred();
    let seen: AbortSignal | undefined;
    const { result, unmount } = renderHook(() =>
      useAiInlineAction({
        actionKey: "improve",
        run: (signal?: AbortSignal) => {
          seen = signal;
          return pending.promise;
        },
        onApply: jest.fn(),
        onSessionChange: jest.fn(),
      }),
    );

    act(() => {
      void result.current.run();
    });
    unmount();

    expect(seen?.aborted).toBe(true);
  });
});

describe("useAiPopoverAction — one paid dispatch at a time", () => {
  it("refuses a retry issued while the first run is still in flight", () => {
    const pending = deferred();
    const run = jest.fn(() => pending.promise);
    const { result } = renderHook(() => useAiPopoverAction({ run }));

    act(() => {
      void result.current.execute();
    });
    act(() => {
      result.current.retry();
      result.current.retry();
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("aborts the in-flight run when the popover closes", () => {
    const pending = deferred();
    let seen: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useAiPopoverAction({
        run: (signal?: AbortSignal) => {
          seen = signal;
          return pending.promise;
        },
      }),
    );

    act(() => {
      void result.current.execute();
    });
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(seen?.aborted).toBe(true);
  });

  it("classifies a failure rather than flattening it to an error", async () => {
    const pending = deferred();
    const { result } = renderHook(() =>
      useAiPopoverAction({ run: () => pending.promise }),
    );

    act(() => {
      void result.current.execute();
    });

    await act(async () => {
      pending.reject(
        new ApiError("Too many concurrent AI requests for this organization", 503),
      );
      await pending.promise.catch(() => undefined);
    });

    expect(result.current.state.status).toBe("queued");
  });
});
