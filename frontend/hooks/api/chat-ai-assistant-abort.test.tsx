import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useAskAI, type AskAiStreamOutcome } from "./chat-ai-assistant";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

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

function bodyLinkedTo(signal: AbortSignal) {
  const waiting: Array<(chunk: Chunk) => void> = [];
  const queued: Chunk[] = [];
  let rejectRead: ((error: unknown) => void) | null = null;

  signal.addEventListener("abort", () => {
    rejectRead?.(new DOMException("aborted", "AbortError"));
  });

  return {
    reader: {
      read(): Promise<Chunk> {
        const next = queued.shift();
        if (next) return Promise.resolve(next);
        return new Promise<Chunk>((resolve, reject) => {
          waiting.push(resolve);
          rejectRead = reject;
        });
      },
    },
    push(text: string) {
      const chunk: Chunk = { done: false, value: new TextEncoder().encode(text) };
      const next = waiting.shift();
      if (next) next(chunk);
      else queued.push(chunk);
    },
  };
}

type Body = ReturnType<typeof bodyLinkedTo>;

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let chatSignal: AbortSignal | null;
let chatBody: Body | null;

function installFetch() {
  chatSignal = null;
  chatBody = null;
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });

    const signal = init?.signal ?? null;
    if (!signal)
      throw new Error("authedFetch called global fetch with no signal at all");
    chatSignal = signal;
    chatBody = bodyLinkedTo(signal);
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      body: { getReader: () => chatBody?.reader },
    });
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

beforeEach(installFetch);

afterAll(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

describe("useAskAI — the abort actually reaches the request", () => {
  it("hands global fetch a signal that the hook's own controller can abort", async () => {
    const { result } = renderHook(() => useAskAI());

    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(chatSignal).not.toBeNull());
    expect(chatSignal?.aborted).toBe(false);

    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });

    expect(chatSignal?.aborted).toBe(true);
    await expect(outcome).resolves.toEqual({ status: "cancelled", text: "" });
  });

  it("keeps the tokens already streamed when the request is aborted", async () => {
    const tokens: string[] = [];
    const { result } = renderHook(() => useAskAI());

    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage(
        [{ role: "user", content: "hi" }],
        (token) => tokens.push(token),
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(chatBody).not.toBeNull());
    await act(async () => {
      chatBody?.push("half an ");
      chatBody?.push("answer");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });

    expect(chatSignal?.aborted).toBe(true);
    await expect(outcome).resolves.toEqual({
      status: "cancelled",
      text: "half an answer",
    });
    expect(tokens.join("")).toBe("half an answer");
  });

  it("aborts the request when the surface unmounts rather than leaving it running", async () => {
    const { result, unmount } = renderHook(() => useAskAI());

    let outcome: Promise<AskAiStreamOutcome> | null = null;
    await act(async () => {
      outcome = result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(chatSignal).not.toBeNull());
    expect(chatSignal?.aborted).toBe(false);

    unmount();

    await waitFor(() => expect(chatSignal?.aborted).toBe(true));
    await expect(outcome).resolves.toEqual({ status: "cancelled", text: "" });
  });

  it("issues exactly one network call for one send", async () => {
    const { result } = renderHook(() => useAskAI());

    await act(async () => {
      void result.current.sendMessage([{ role: "user", content: "hi" }], jest.fn());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const chatCalls = fetchMock.mock.calls.filter(
      (call) => !String(call[0]).includes("/api/auth/session"),
    );
    expect(chatCalls).toHaveLength(1);

    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });
  });
});
