import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { apiClient } from "@/lib/api-client";
import { streamAiText } from "./ai-text-stream";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();


const BACKEND_LONGEST_STREAM_DEADLINE_MS = 120_000;
const ORDINARY_REQUEST_TIMEOUT_MS = 30_000;

const STREAM_PATH = "/chat";
const originalFetch = globalThis.fetch;

interface Chunk {
  done: boolean;
  value?: Uint8Array;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function installRecordingTimeout(): { requested: number[]; fireAll: () => void } {
  const requested: number[] = [];
  const controllers: AbortController[] = [];
  jest
    .spyOn(AbortSignal, "timeout")
    .mockImplementation(((ms: number): AbortSignal => {
      requested.push(ms);
      const controller = new AbortController();
      controllers.push(controller);
      return controller.signal;
    }) as typeof AbortSignal.timeout);
  return {
    requested,
    fireAll: () => {
      for (const controller of controllers)
        controller.abort(new DOMException("timed out", "TimeoutError"));
    },
  };
}

function heldStream(chunks: string[]) {
  return (signal: AbortSignal | null) => {
    const queued: Chunk[] = chunks.map((c) => ({ done: false, value: encode(c) }));
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      body: {
        getReader() {
          return {
            read(): Promise<Chunk> {
              if (signal?.aborted)
                return Promise.reject(new DOMException("aborted", "AbortError"));
              const next = queued.shift();
              if (next) return Promise.resolve(next);
              return new Promise<Chunk>((_, reject) => {
                signal?.addEventListener("abort", () =>
                  reject(new DOMException("aborted", "AbortError")),
                );
              });
            },
          };
        },
      },
    };
  };
}

function installFetch(respond: (signal: AbortSignal | null) => Record<string, unknown>) {
  const fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    if (String(input).includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });
    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    return Promise.resolve(respond(signal));
  });
  Object.assign(globalThis, { fetch: fetchMock });
  return fetchMock;
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

describe("the client deadline on an AI stream must not be tighter than the backend's", () => {
  it("arms a timeout at least as long as the longest backend stream deadline", async () => {
    const timeout = installRecordingTimeout();
    installFetch(heldStream(["Senior "]));

    const pending = streamAiText({ path: STREAM_PATH, body: { messages: [] } });
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(timeout.requested.length).toBeGreaterThan(0);
    expect(Math.max(...timeout.requested)).toBeGreaterThanOrEqual(
      BACKEND_LONGEST_STREAM_DEADLINE_MS,
    );

    timeout.fireAll();
    await pending;
  });

  it("a fired client deadline truncates a live stream and reports it as cancelled", async () => {
    const timeout = installRecordingTimeout();
    installFetch(heldStream(["Senior ", "Platform "]));
    const tokens: string[] = [];

    const pending = streamAiText({
      path: STREAM_PATH,
      body: { messages: [] },
      onToken: (t) => tokens.push(t),
    });
    await new Promise((r) => setTimeout(r, 0));
    timeout.fireAll();
    const outcome = await pending;

    expect(outcome.status).toBe("cancelled");
    expect(tokens.join("")).toBe("Senior Platform ");
  });

  it("(anti-vacuous) an ordinary API call still arms the 30 s request timeout", async () => {
    const timeout = installRecordingTimeout();
    installFetch(() => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: true }),
    }));

    await apiClient.post("/ai/summaries", { text: "hello" }).catch(() => undefined);

    expect(timeout.requested.at(-1)).toBe(ORDINARY_REQUEST_TIMEOUT_MS);
  });
});
