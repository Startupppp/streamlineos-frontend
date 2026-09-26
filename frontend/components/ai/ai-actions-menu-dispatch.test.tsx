import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { AiActionsMenu, type AiAction, type AiActionResult } from "./ai-actions-menu";
import type { AiInlineSession } from "./ai-inline-preview";

function deferred() {
  let resolve!: (value: AiActionResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<AiActionResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function openAndRun() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /AI/i }));
}

describe("AiActionsMenu — a state transition never issues a second paid call", () => {
  it("ignores retry while the first run is still in flight, then settles once", async () => {
    const pending = deferred();
    const run = jest.fn(() => pending.promise);
    const sessions: (AiInlineSession | null)[] = [];
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run,
      onInlineChange: (session) => sessions.push(session),
    };

    render(<AiActionsMenu actions={[action]} />);
    await openAndRun();

    expect(run).toHaveBeenCalledTimes(1);
    const loading = sessions[sessions.length - 1];
    expect(loading?.state.status).toBe("loading");

    act(() => {
      loading?.retry();
      loading?.retry();
    });
    expect(run).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ text: "summary" });
      await pending.promise;
    });

    const settled = sessions[sessions.length - 1];
    expect(settled?.state.status).toBe("ready");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("cancels the in-flight run and drops the answer that arrives afterwards", async () => {
    const pending = deferred();
    let seen: AbortSignal | undefined;
    const sessions: (AiInlineSession | null)[] = [];
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run: (signal?: AbortSignal) => {
        seen = signal;
        return pending.promise;
      },
      onInlineChange: (session) => sessions.push(session),
    };

    render(<AiActionsMenu actions={[action]} />);
    await openAndRun();

    act(() => {
      sessions[sessions.length - 1]?.cancel();
    });

    expect(seen?.aborted).toBe(true);
    expect(sessions[sessions.length - 1]?.state.status).toBe("cancelled");

    await act(async () => {
      pending.resolve({ text: "late answer" });
      await pending.promise;
    });

    expect(sessions[sessions.length - 1]?.state.status).toBe("cancelled");
  });

  it("renders the concurrency cap as queued, not as a generic error", async () => {
    const pending = deferred();
    const sessions: (AiInlineSession | null)[] = [];
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run: () => pending.promise,
      onInlineChange: (session) => sessions.push(session),
    };

    render(<AiActionsMenu actions={[action]} />);
    await openAndRun();

    await act(async () => {
      pending.reject(
        new ApiError("Too many concurrent AI requests for this organization", 503, "AI_CONCURRENCY_LIMIT"),
      );
      await pending.promise.catch(() => undefined);
    });

    expect(sessions[sessions.length - 1]?.state.status).toBe("queued");
  });

  it("aborts the abandoned run when the menu unmounts", async () => {
    const pending = deferred();
    let seen: AbortSignal | undefined;
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run: (signal?: AbortSignal) => {
        seen = signal;
        return pending.promise;
      },
      onInlineChange: jest.fn(),
    };

    const view = render(<AiActionsMenu actions={[action]} />);
    await openAndRun();
    view.unmount();

    expect(seen?.aborted).toBe(true);
  });

  it("charges once under StrictMode's double-invoked lifecycle", async () => {
    const pending = deferred();
    const run = jest.fn(() => pending.promise);
    let seen: AbortSignal | undefined;
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run: (signal?: AbortSignal) => {
        seen = signal;
        return run();
      },
      onInlineChange: jest.fn(),
    };

    render(
      <StrictMode>
        <AiActionsMenu actions={[action]} />
      </StrictMode>,
    );
    await openAndRun();

    expect(run).toHaveBeenCalledTimes(1);
    expect(seen?.aborted).toBe(false);

    await act(async () => {
      pending.resolve({ text: "summary" });
      await pending.promise;
    });

    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("AiActionsMenu — streaming, retry and partial output reach the surface", () => {
  it("renders streamed tokens as a streaming state and keeps them when stopped", async () => {
    const pending = deferred();
    const sessions: (AiInlineSession | null)[] = [];
    let emit: ((chunk: string) => void) | undefined;
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run: (_signal?: AbortSignal, onToken?: (chunk: string) => void) => {
        emit = onToken;
        return pending.promise;
      },
      onInlineChange: (session) => sessions.push(session),
    };

    render(<AiActionsMenu actions={[action]} />);
    await openAndRun();

    act(() => {
      emit?.("half an ");
      emit?.("answer");
    });

    const streaming = sessions[sessions.length - 1];
    expect(streaming?.state.status).toBe("streaming");
    if (streaming?.state.status === "streaming")
      expect(streaming.state.text).toBe("half an answer");

    act(() => {
      sessions[sessions.length - 1]?.cancel();
    });

    const cancelled = sessions[sessions.length - 1];
    expect(cancelled?.state.status).toBe("cancelled");
    if (cancelled?.state.status === "cancelled")
      expect(cancelled.state.text).toBe("half an answer");
  });

  it("counts a retry as a second attempt rather than a fresh first load", async () => {
    const first = deferred();
    const second = deferred();
    const run = jest
      .fn<Promise<AiActionResult>, [AbortSignal?, ((chunk: string) => void)?]>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const sessions: (AiInlineSession | null)[] = [];
    const action: AiAction = {
      key: "summarize",
      label: "summarize",
      surface: "inline",
      run,
      onInlineChange: (session) => sessions.push(session),
    };

    render(<AiActionsMenu actions={[action]} />);
    await openAndRun();

    const firstLoading = sessions[sessions.length - 1];
    expect(firstLoading?.state.status).toBe("loading");
    if (firstLoading?.state.status === "loading")
      expect(firstLoading.state.attempt).toBe(1);

    await act(async () => {
      first.reject(new ApiError("AI provider is temporarily unavailable", 503));
      await first.promise.catch(() => undefined);
    });

    act(() => {
      sessions[sessions.length - 1]?.retry();
    });

    const retryLoading = sessions[sessions.length - 1];
    expect(retryLoading?.state.status).toBe("loading");
    if (retryLoading?.state.status === "loading")
      expect(retryLoading.state.attempt).toBe(2);

    await act(async () => {
      second.resolve({ text: "summary" });
      await second.promise;
    });
  });
});
