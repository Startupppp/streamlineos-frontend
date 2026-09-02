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

async function openAndRun(actionKey: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /AI/i }));
  await user.click(await screen.findByText(actionKey));
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
    await openAndRun("summarize");

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
    await openAndRun("summarize");

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
    await openAndRun("summarize");

    await act(async () => {
      pending.reject(
        new ApiError("Too many concurrent AI requests for this organization", 503),
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
    await openAndRun("summarize");
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
    await openAndRun("summarize");

    expect(run).toHaveBeenCalledTimes(1);
    expect(seen?.aborted).toBe(false);

    await act(async () => {
      pending.resolve({ text: "summary" });
      await pending.promise;
    });

    expect(run).toHaveBeenCalledTimes(1);
  });
});
