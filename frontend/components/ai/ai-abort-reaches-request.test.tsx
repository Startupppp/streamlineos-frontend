import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { AiActionsMenu, type AiAction } from "./ai-actions-menu";
import type { AiInlineSession } from "./ai-inline-preview";
import { useAiInlineAction } from "./use-ai-inline-action";

installAbortSignalPolyfill();

const AI_PATH = "/ai/tickets/1/2/summarize";

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;

function installFetch() {
  requestSignal = null;
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });

    const signal = init?.signal ?? null;
    if (!signal)
      throw new Error("authedFetch reached global fetch with no signal");
    requestSignal = signal;

    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

beforeEach(installFetch);

afterAll(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

function summarizeAction(
  onInlineChange: (session: AiInlineSession | null) => void,
): AiAction {
  return {
    key: "summarize",
    label: "summarize",
    surface: "inline",
    run: async (signal) => {
      const res = await apiClient.post<{ text: string }>(AI_PATH, {}, { signal });
      return { text: res.text };
    },
    onInlineChange,
  };
}

async function openAndRun() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /AI/i }));
  await user.click(await screen.findByText("summarize"));
}

describe("a buffered AI action's cancel reaches the outgoing request", () => {
  it("aborts the signal the API client handed to fetch when the user presses Stop", async () => {
    const sessions: (AiInlineSession | null)[] = [];
    render(<AiActionsMenu actions={[summarizeAction((s) => sessions.push(s))]} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => {
      sessions[sessions.length - 1]?.cancel();
      await Promise.resolve();
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(sessions[sessions.length - 1]?.state.status).toBe("cancelled");
  });

  it("aborts the outgoing request when the surface unmounts", async () => {
    const view = render(<AiActionsMenu actions={[summarizeAction(jest.fn())]} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    view.unmount();

    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  it("aborts the outgoing request when an inline session is rejected", async () => {
    const sessions: (AiInlineSession | null)[] = [];
    const { result } = renderHook(() =>
      useAiInlineAction({
        actionKey: "summarize",
        run: async (signal) => {
          const res = await apiClient.post<{ text: string }>(AI_PATH, {}, { signal });
          return { text: res.text };
        },
        onApply: jest.fn(),
        onSessionChange: (session) => sessions.push(session),
      }),
    );

    await act(async () => {
      void result.current.run();
      await Promise.resolve();
    });

    await waitFor(() => expect(requestSignal).not.toBeNull());

    await act(async () => {
      sessions[sessions.length - 1]?.reject();
      await Promise.resolve();
    });

    expect(requestSignal?.aborted).toBe(true);
  });

  it("sends exactly one request for one dispatch", async () => {
    render(<AiActionsMenu actions={[summarizeAction(jest.fn())]} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    const aiCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes(AI_PATH),
    );
    expect(aiCalls).toHaveLength(1);
  });
});
