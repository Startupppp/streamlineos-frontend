import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAskAI, type AskAiStreamOutcome } from "./chat-ai-assistant";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

const authedFetch = jest.fn();

jest.mock("@/lib/api-client", () => {
  const envelope = jest.requireActual<typeof import("@/lib/api-envelope")>(
    "@/lib/api-envelope",
  );
  return {
    ApiError: envelope.ApiError,
    isApiError: envelope.isApiError,
    getApiErrorCode: envelope.getApiErrorCode,
    apiClient: {},
    buildUrl: (path: string) => `http://api.test${path}`,
    authedFetch: (...args: unknown[]) => authedFetch(...args),
  };
});

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn(() => ({ data: undefined })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(() => true) }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    aiChat: {
      conversations: () => ["aiChat", "conversations"],
      conversationMessages: (id: number) => ["aiChat", "messages", id],
    },
  },
}));

interface Chunk {
  done: boolean;
  value?: Uint8Array;
}

function controllableStream(signal: AbortSignal) {
  const queue: Array<(chunk: Chunk) => void> = [];
  const pendingChunks: Chunk[] = [];
  let rejectRead: ((error: unknown) => void) | null = null;

  signal.addEventListener("abort", () => {
    rejectRead?.(new DOMException("aborted", "AbortError"));
  });

  return {
    reader: {
      read(): Promise<Chunk> {
        const next = pendingChunks.shift();
        if (next) return Promise.resolve(next);
        return new Promise<Chunk>((resolve, reject) => {
          queue.push(resolve);
          rejectRead = reject;
        });
      },
    },
    push(text: string) {
      const chunk: Chunk = { done: false, value: new TextEncoder().encode(text) };
      const waiting = queue.shift();
      if (waiting) waiting(chunk);
      else pendingChunks.push(chunk);
    },
    finish() {
      const waiting = queue.shift();
      if (waiting) waiting({ done: true });
      else pendingChunks.push({ done: true });
    },
  };
}

let lastSignal: AbortSignal | null = null;
let lastStream: ReturnType<typeof controllableStream> | null = null;

/**
 * The signal lives in `authedFetch`'s FOURTH argument, not in `init`. A signal
 * placed in `init` is silently overwritten by the request timeout inside
 * `authedFetch`, so a mock that read `init.signal` would pass while the real
 * client cancelled nothing.
 */
function streamingResponse(...args: unknown[]) {
  const signal = args[3];
  if (!(signal instanceof AbortSignal))
    throw new Error("authedFetch was given no AbortSignal in its signal slot");
  lastSignal = signal;
  lastStream = controllableStream(signal);
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({
      "content-type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
    }),
    body: { getReader: () => lastStream?.reader },
  });
}

function textDelta(delta: string): string {
  return `data: ${JSON.stringify({ type: "text-delta", id: "a", delta })}\n\n`;
}

describe("useAskAI — the one streaming AI client", () => {
  beforeEach(() => {
    authedFetch.mockReset();
    lastSignal = null;
    lastStream = null;
  });

  it("refuses a second send while a stream is already in flight", async () => {
    authedFetch.mockImplementation(streamingResponse);

    const { result } = renderHook(() => useAskAI());

    let first: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      first = result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
    });

    let second: AskAiStreamOutcome | null = null;
    await act(async () => {
      second = await result.current.sendMessage(
        [{ role: "user", content: "hi again" }],
        jest.fn(),
      );
    });

    expect(second).toEqual({ status: "busy" });
    expect(authedFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      lastStream?.finish();
      await first;
    });
  });

  it("renders the chat route's SSE frames as answer text, not as the raw data: lines the user was shown", async () => {
    authedFetch.mockImplementation(streamingResponse);

    const tokens: string[] = [];
    const { result } = renderHook(() => useAskAI());

    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage(
        [{ role: "user", content: "summarize my day" }],
        (token) => tokens.push(token),
      );
      await Promise.resolve();
    });

    await act(async () => {
      lastStream?.push(`data: ${JSON.stringify({ type: "start" })}\n\n`);
      lastStream?.push(textDelta("I don't"));
      lastStream?.push(textDelta(" have access"));
      lastStream?.push(`data: ${JSON.stringify({ type: "finish" })}\n\ndata: [DONE]\n\n`);
      lastStream?.finish();
      await Promise.resolve();
    });

    await expect(outcome).resolves.toEqual({
      status: "completed",
      text: "I don't have access",
    });
    expect(tokens.join("")).not.toContain("data:");
  });

  it("keeps the partial output when the user stops the stream", async () => {
    authedFetch.mockImplementation(streamingResponse);

    const tokens: string[] = [];
    const { result } = renderHook(() => useAskAI());

    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage(
        [{ role: "user", content: "hi" }],
        (token) => tokens.push(token),
      );
      await Promise.resolve();
    });

    await act(async () => {
      lastStream?.push(textDelta("half an "));
      lastStream?.push(textDelta("answer"));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });

    await expect(outcome).resolves.toEqual({
      status: "cancelled",
      text: "half an answer",
    });
    expect(tokens.join("")).toBe("half an answer");
  });

  it("stops spending when the component unmounts mid-stream", async () => {
    authedFetch.mockImplementation(streamingResponse);

    const { result, unmount } = renderHook(() => useAskAI());
    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
    });

    unmount();

    await waitFor(() => expect(lastSignal?.aborted).toBe(true));
    await expect(outcome).resolves.toEqual({ status: "cancelled", text: "" });
  });

  it("raises a typed ApiError so the surface can tell 402 from 503", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 402,
      statusText: "Payment Required",
      json: () =>
        Promise.resolve({ code: "INSUFFICIENT_CREDITS", message: "Insufficient AI credits" }),
    });

    const { result } = renderHook(() => useAskAI());

    const error = await act(async () =>
      result.current
        .sendMessage([{ role: "user", content: "hi" }], jest.fn())
        .catch((e: unknown) => e),
    );

    const { classifyAiError } = jest.requireActual<
      typeof import("@/components/ai/ai-error-state")
    >("@/components/ai/ai-error-state");
    expect(classifyAiError(error).status).toBe("quota");
  });

  it("releases the in-flight lock after a failure so the user can retry", async () => {
    authedFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.resolve({ message: "AI chat provider is temporarily unavailable" }),
    });

    const { result } = renderHook(() => useAskAI());

    await act(async () => {
      await result.current
        .sendMessage([{ role: "user", content: "hi" }], jest.fn())
        .catch(() => undefined);
    });
    await act(async () => {
      await result.current
        .sendMessage([{ role: "user", content: "hi" }], jest.fn())
        .catch(() => undefined);
    });

    expect(authedFetch).toHaveBeenCalledTimes(2);
  });
});
