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

describe("useAskAI — the one streaming AI client", () => {
  beforeEach(() => {
    authedFetch.mockReset();
  });

  it("refuses a second send while a stream is already in flight", async () => {
    let stream: ReturnType<typeof controllableStream> | null = null;
    authedFetch.mockImplementation(
      (_url: string, init: RequestInit) => {
        stream = controllableStream(init.signal as AbortSignal);
        return Promise.resolve({
          ok: true,
          status: 200,
          body: { getReader: () => stream?.reader },
        });
      },
    );

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
      stream?.finish();
      await first;
    });
  });

  it("keeps the partial output when the user stops the stream", async () => {
    let stream: ReturnType<typeof controllableStream> | null = null;
    authedFetch.mockImplementation((_url: string, init: RequestInit) => {
      stream = controllableStream(init.signal as AbortSignal);
      return Promise.resolve({
        ok: true,
        status: 200,
        body: { getReader: () => stream?.reader },
      });
    });

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
      stream?.push("half an ");
      stream?.push("answer");
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
    let seen: AbortSignal | null = null;
    let stream: ReturnType<typeof controllableStream> | null = null;
    authedFetch.mockImplementation((_url: string, init: RequestInit) => {
      seen = init.signal as AbortSignal;
      stream = controllableStream(seen);
      return Promise.resolve({
        ok: true,
        status: 200,
        body: { getReader: () => stream?.reader },
      });
    });

    const { result, unmount } = renderHook(() => useAskAI());
    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
    });

    unmount();

    await waitFor(() => expect(seen?.aborted).toBe(true));
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
