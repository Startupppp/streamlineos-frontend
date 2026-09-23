import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, renderHook } from "@testing-library/react";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { streamAiText, useAiTextStream } from "./ai-text-stream";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

/**
 * Drives the REAL `lib/api-client` with a mocked `global.fetch`, because the defect this
 * client exists to prevent lived between the hook and `authedFetch`: a signal placed in
 * `init` is overwritten, so a test that mocks `authedFetch` and reads `init.signal` passes
 * while every cancel in the app is a no-op.
 *
 * The route under test is a NON-chat `/stream` route, since the point of the extraction is
 * that the other nine routes get the same client rather than a second copy of the loop.
 */

const JD_PATH = "/ai/generate-jd/stream";

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;

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
    getReader() {
      return {
        read(): Promise<Chunk> {
          if (signal?.aborted)
            return Promise.reject(new DOMException("aborted", "AbortError"));
          return Promise.resolve(queued.shift() ?? { done: true });
        },
      };
    },
  };
}

function heldBody(signal: AbortSignal | null, firstChunk: string) {
  let served = false;
  return {
    getReader() {
      return {
        read(): Promise<Chunk> {
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
      };
    },
  };
}

function installFetch(
  respond: (signal: AbortSignal | null) => Record<string, unknown>,
): void {
  requestSignal = null;
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });
    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    requestSignal = signal;
    return Promise.resolve(respond(signal));
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

function okStream(chunks: string[], headers: Record<string, string> = {}) {
  return (signal: AbortSignal | null) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(headers),
    body: bodyOf(chunks, signal),
  });
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

describe("streamAiText — the shared AI text-stream client", () => {
  it("posts to the stream route and forwards every delta in order", async () => {
    installFetch(okStream(["Senior ", "Platform ", "Engineer"]));
    const tokens: string[] = [];

    const outcome = await streamAiText({
      path: JD_PATH,
      body: { title: "Engineer" },
      onToken: (t) => tokens.push(t),
    });

    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed")
      expect(outcome.text).toBe("Senior Platform Engineer");
    expect(tokens).toEqual(["Senior ", "Platform ", "Engineer"]);

    const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(String(url)).toContain(JD_PATH);
    expect((init as RequestInit).method).toBe("POST");
  });

  it("never serialises the AbortSignal into the request body", async () => {
    installFetch(okStream(["ok"]));
    const controller = new AbortController();

    await streamAiText({
      path: JD_PATH,
      body: { title: "Engineer" },
      signal: controller.signal,
    });

    const init = (fetchMock.mock.calls.at(-1) ?? [])[1] as RequestInit;
    expect(String(init.body)).not.toContain("signal");
    expect(JSON.parse(String(init.body))).toEqual({ title: "Engineer" });
  });

  it("puts the caller's signal in the outgoing request, so Stop reaches the backend", async () => {
    installFetch(okStream(["ok"]));
    const controller = new AbortController();

    await streamAiText({
      path: JD_PATH,
      body: {},
      signal: controller.signal,
    });

    expect(requestSignal).not.toBeNull();
    expect(requestSignal?.aborted).toBe(false);
    controller.abort();
    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps the partial output when the stream is cancelled mid-flight", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "Senior Platform "),
    }));
    const controller = new AbortController();
    const tokens: string[] = [];
    let sawFirstToken: () => void = () => {};
    const firstToken = new Promise<void>((resolve) => {
      sawFirstToken = resolve;
    });

    const pending = streamAiText({
      path: JD_PATH,
      body: {},
      onToken: (t) => {
        tokens.push(t);
        sawFirstToken();
      },
      signal: controller.signal,
    });
    await firstToken;
    controller.abort();

    const outcome = await pending;
    expect(tokens).toEqual(["Senior Platform "]);
    expect(outcome.status).toBe("cancelled");
    if (outcome.status === "cancelled") expect(outcome.text).toBe("Senior Platform ");
  });

  it("returns cancelled without opening a request when the signal is already aborted", async () => {
    installFetch(okStream(["never"]));
    const controller = new AbortController();
    controller.abort();

    const outcome = await streamAiText({
      path: JD_PATH,
      body: {},
      signal: controller.signal,
    });

    expect(outcome.status).toBe("cancelled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps Zod field issues on a 400 so the composer can name what failed", async () => {
    const details = [
      {
        path: "messages.0.content",
        message: "Too big: expected string to have <=10000 characters",
      },
    ];
    installFetch(() => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          message: "Validation failed.",
          code: "VALIDATION_FAILED",
          details,
        }),
    }));

    await expect(streamAiText({ path: JD_PATH, body: {} })).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
      details,
    });
  });

  it("raises the HTTP status so credit exhaustion stays renderable as 402", async () => {
    installFetch(() => ({
      ok: false,
      status: 402,
      statusText: "Payment Required",
      headers: new Headers(),
      json: () =>
        Promise.resolve({ message: "AI credits exhausted", code: "INSUFFICIENT_CREDITS" }),
    }));

    await expect(streamAiText({ path: JD_PATH, body: {} })).rejects.toMatchObject({
      status: 402,
      code: "INSUFFICIENT_CREDITS",
    });
  });

  it("exposes response headers, so sidecar citations are reachable", async () => {
    const sources = encodeURIComponent(JSON.stringify([{ articleId: 7, title: "Leave" }]));
    installFetch(okStream(["answer"], { "x-kb-sources": sources }));

    const outcome = await streamAiText({ path: "/public/kb/stream-ask", body: {} });

    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed")
      expect(outcome.headers.get("x-kb-sources")).toBe(sources);
  });

  it("reads the body as raw text, not as SSE frames", async () => {
    installFetch(okStream(["data: not-an-event\n\n"]));
    const outcome = await streamAiText({ path: JD_PATH, body: {} });
    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed")
      expect(outcome.text).toBe("data: not-an-event\n\n");
  });
});

describe("useAiTextStream", () => {
  it("refuses a second stream while one is open rather than opening a second paid call", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "first"),
    }));

    const { result } = renderHook(() => useAiTextStream());
    let second: { status: string } | undefined;

    await act(async () => {
      const first = result.current.stream({ path: JD_PATH, body: {} });
      await Promise.resolve();
      second = await result.current.stream({ path: JD_PATH, body: {} });
      result.current.stop();
      await first;
    });

    expect(second?.status).toBe("busy");
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes(JD_PATH))).toHaveLength(1);
  });

  it("aborts the open stream when the surface unmounts", async () => {
    installFetch((signal) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: heldBody(signal, "partial"),
    }));

    const { result, unmount } = renderHook(() => useAiTextStream());
    let pending: Promise<{ status: string }> | undefined;

    await act(async () => {
      pending = result.current.stream({ path: JD_PATH, body: {} });
      await Promise.resolve();
      await Promise.resolve();
    });

    unmount();
    expect(requestSignal?.aborted).toBe(true);
    await expect(pending).resolves.toMatchObject({ status: "cancelled" });
  });
});
