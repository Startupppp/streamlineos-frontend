import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { AiActionsMenu, type AiAction } from "@/components/ai/ai-actions-menu";
import type { AiInlineSession } from "@/components/ai/ai-inline-preview";
import { streamSurveyResponseSummary } from "@/hooks/api/surveys/survey-ai";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

/**
 * The survey results surface is the second non-chat `/stream` route wired to a real user.
 * Everything below the action runs for real — `streamAiText`, `authedFetch`, the combined
 * signal — with only `global.fetch` mocked, because the defect this seam keeps reproducing
 * (a signal placed in `init`, or dropped for want of `AbortSignal.any`) is invisible to any
 * test that stubs the client.
 */

const SURVEY_ID = 7;
const STREAM_PATH = `/ai/surveys/${SURVEY_ID}/summarize-responses/stream`;
const BUFFERED_PATH = `/ai/surveys/${SURVEY_ID}/summarize-responses`;

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;
let requestedUrls: string[];

interface Chunk {
  done: boolean;
  value?: Uint8Array;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bodyOf(chunks: string[], signal: AbortSignal | null) {
  const queued: Chunk[] = chunks.map((c) => ({ done: false, value: encode(c) }));
  queued.push({ done: true });
  return {
    getReader: () => ({
      read: (): Promise<Chunk> => {
        if (signal?.aborted)
          return Promise.reject(new DOMException("aborted", "AbortError"));
        return Promise.resolve(queued.shift() ?? { done: true });
      },
    }),
  };
}

/** Serves one delta, then hangs until the signal aborts — a stream the user stops mid-answer. */
function heldBody(signal: AbortSignal | null, firstChunk: string) {
  let served = false;
  return {
    getReader: () => ({
      read: (): Promise<Chunk> => {
        if (signal?.aborted)
          return Promise.reject(new DOMException("aborted", "AbortError"));
        if (!served) {
          served = true;
          return Promise.resolve({ done: false, value: encode(firstChunk) });
        }
        return new Promise<Chunk>((_, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      },
    }),
  };
}

function installFetch(
  respond: (signal: AbortSignal | null) => Record<string, unknown>,
): void {
  requestSignal = null;
  requestedUrls = [];
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });
    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    requestSignal = signal;
    requestedUrls.push(url);
    return Promise.resolve(respond(signal));
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

function okStream(chunks: string[]) {
  return (signal: AbortSignal | null) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    body: bodyOf(chunks, signal),
  });
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

/** The action exactly as `ResultsTab` builds it, so the test covers the shipped wiring. */
function summarizeAction(
  onInlineChange: (session: AiInlineSession | null) => void,
): AiAction {
  return {
    key: "summarize-responses",
    label: "Summarize responses",
    surface: "inline",
    run: async (signal, onToken) => {
      const outcome = await streamSurveyResponseSummary({
        surveyId: SURVEY_ID,
        onToken,
        signal,
      });
      return { text: outcome.text };
    },
    onInlineChange,
  };
}

async function openAndRun() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /AI/i }));
  await user.click(await screen.findByText("Summarize responses"));
}

describe("survey response summary streams instead of buffering", () => {
  it("posts to the /stream route, not the buffered sibling", async () => {
    installFetch(okStream(["Most respondents ", "praised onboarding."]));
    const tokens: string[] = [];

    const outcome = await streamSurveyResponseSummary({
      surveyId: SURVEY_ID,
      onToken: (t) => tokens.push(t),
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]?.endsWith(STREAM_PATH)).toBe(true);
    expect(requestedUrls[0]?.endsWith(BUFFERED_PATH)).toBe(false);
    expect(tokens).toEqual(["Most respondents ", "praised onboarding."]);
    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed")
      expect(outcome.text).toBe("Most respondents praised onboarding.");
  });

  it("sends the caller's signal to fetch rather than serialising it into the body", async () => {
    installFetch(okStream(["ok"]));
    const controller = new AbortController();

    await streamSurveyResponseSummary({
      surveyId: SURVEY_ID,
      signal: controller.signal,
    });

    const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(init.signal).toBeDefined();
    expect(String(init.body)).not.toContain("signal");
  });

  it("renders the answer as it arrives instead of after it completes", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "Most respondents "),
    }));

    const sessions: (AiInlineSession | null)[] = [];
    render(<AiActionsMenu actions={[summarizeAction((s) => sessions.push(s))]} />);
    await openAndRun();

    await waitFor(() =>
      expect(
        sessions.some(
          (s) => s?.state.status === "streaming" && s.state.text === "Most respondents ",
        ),
      ).toBe(true),
    );
    expect(sessions.at(-1)?.state.status).toBe("streaming");
  });

  it("Stop aborts the outgoing request and keeps the partial answer", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "Most respondents "),
    }));

    const sessions: (AiInlineSession | null)[] = [];
    render(<AiActionsMenu actions={[summarizeAction((s) => sessions.push(s))]} />);
    await openAndRun();

    await waitFor(() => expect(sessions.at(-1)?.state.status).toBe("streaming"));
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => {
      sessions.at(-1)?.cancel();
      await Promise.resolve();
    });

    expect(requestSignal?.aborted).toBe(true);
    const final = sessions.at(-1)?.state;
    expect(final?.status).toBe("cancelled");
    if (final?.status === "cancelled") expect(final.text).toBe("Most respondents ");
  });

  it("aborts the stream when the surface unmounts", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "Most "),
    }));

    const view = render(<AiActionsMenu actions={[summarizeAction(jest.fn())]} />);
    await openAndRun();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    view.unmount();

    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  it("dispatches exactly one paid request per run", async () => {
    installFetch(okStream(["done"]));

    render(<AiActionsMenu actions={[summarizeAction(jest.fn())]} />);
    await openAndRun();

    await waitFor(() => expect(requestedUrls).toHaveLength(1));
    expect(requestedUrls.filter((u) => u.includes(STREAM_PATH))).toHaveLength(1);
  });
});
