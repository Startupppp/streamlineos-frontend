
export interface StreamChunk {
  done: boolean;
  value?: Uint8Array;
}

export interface FetchRecorder {
  mock: jest.Mock;
  urls: string[];
  bodies: Record<string, string>;
  signal: () => AbortSignal | null;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function aborted(): DOMException {
  return new DOMException("aborted", "AbortError");
}

function completingBody(chunks: string[], signal: AbortSignal | null) {
  const queued: StreamChunk[] = chunks.map((c) => ({ done: false, value: encode(c) }));
  queued.push({ done: true });
  return {
    getReader: () => ({
      read: (): Promise<StreamChunk> => {
        if (signal?.aborted) return Promise.reject(aborted());
        return Promise.resolve(queued.shift() ?? { done: true });
      },
    }),
  };
}

function heldBody(chunks: string[], signal: AbortSignal | null) {
  const queued = [...chunks];
  return {
    getReader: () => ({
      read: (): Promise<StreamChunk> => {
        if (signal?.aborted) return Promise.reject(aborted());
        const next = queued.shift();
        if (next !== undefined) return Promise.resolve({ done: false, value: encode(next) });
        return new Promise<StreamChunk>((_, reject) => {
          signal?.addEventListener("abort", () => reject(aborted()));
        });
      },
    }),
  };
}

export type StreamResponder = (signal: AbortSignal | null) => Record<string, unknown>;

export function sourcesHeader(sources: unknown[]): Headers {
  return new Headers({ "x-ai-sources": encodeURIComponent(JSON.stringify(sources)) });
}

export function streamsThenEnds(chunks: string[], sources: unknown[]): StreamResponder {
  return (signal) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: sourcesHeader(sources),
    body: completingBody(chunks, signal),
  });
}

export function streamsThenHangs(chunks: string[], sources: unknown[]): StreamResponder {
  return (signal) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: sourcesHeader(sources),
    body: heldBody(chunks, signal),
  });
}

export function refuses(status: number, body: Record<string, unknown>): StreamResponder {
  return () => ({
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  });
}

export function jsonOnce(data: unknown): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve({ success: true, data }),
  };
}

export function installFetch(
  respond: StreamResponder,
  routes: Record<string, Record<string, unknown>> = {},
): FetchRecorder {
  let signal: AbortSignal | null = null;
  const urls: string[] = [];
  const bodies: Record<string, string> = {};

  const mock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve({ ok: false, status: 401 });
    const requestSignal = init?.signal ?? null;
    if (!requestSignal) throw new Error("authedFetch reached global fetch with no signal");
    urls.push(url);
    if (typeof init?.body === "string") bodies[url] = init.body;
    for (const [path, response] of Object.entries(routes)) {
      if (url.endsWith(path)) return Promise.resolve(response);
    }
    signal = requestSignal;
    return Promise.resolve(respond(requestSignal));
  });

  Object.assign(globalThis, { fetch: mock });
  return { mock, urls, bodies, signal: () => signal };
}
