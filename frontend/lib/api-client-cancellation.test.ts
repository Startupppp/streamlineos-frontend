import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { apiClient, authedFetch, isApiError } from "@/lib/api-client";

/**
 * The test that had to exist: it asserts the CALLER'S signal actually aborts the
 * request. The one that missed this mocked `authedFetch` and inspected
 * `init.signal` — which stayed truthy the whole time the client was discarding
 * it, first by overwriting `init.signal` with its own, then by dropping the
 * caller's signal entirely wherever `AbortSignal.any` is unavailable.
 *
 * So `fetch` itself is the mock here, and it never resolves until the signal it
 * was handed says otherwise.
 */

interface FetchCall {
  readonly url: string;
  readonly signal: AbortSignal | null | undefined;
}

const calls: FetchCall[] = [];

type FetchImpl = typeof fetch;

/**
 * jsdom ships no `Response`, so the doubles are asserted into that slot here and
 * nowhere else. Only `ok`, `status`, `statusText` and `json` are ever read on
 * this path.
 */
function responseDouble(fields: {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: unknown;
}): Response {
  return {
    ok: fields.ok,
    status: fields.status,
    statusText: fields.statusText ?? "",
    json: async () => fields.body,
  } as Response;
}

const SESSION_MISS = responseDouble({ ok: false, status: 401 });

/** The token lookup is itself a fetch, so the real request is two ticks away. */
async function untilRequestIssued(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

/** Hangs until the signal it was given aborts — a real request that outlives Stop. */
function hangingFetch(): FetchImpl {
  return (input, init) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve(SESSION_MISS);

    const signal = init?.signal;
    calls.push({ url, signal });
    return new Promise<Response>((_resolve, reject) => {
      if (!signal) return;
      if (signal.aborted) {
        reject(signal.reason ?? abortError());
        return;
      }
      signal.addEventListener("abort", () => reject(signal.reason ?? abortError()), {
        once: true,
      });
    });
  };
}

const realAny = AbortSignal.any;
const realFetch = globalThis.fetch;

function installFetch(impl: FetchImpl): void {
  globalThis.fetch = impl;
}

beforeEach(() => {
  calls.length = 0;
  installFetch(hangingFetch());
});

afterEach(() => {
  globalThis.fetch = realFetch;
  Object.defineProperty(AbortSignal, "any", {
    configurable: true,
    writable: true,
    value: realAny,
  });
});

function removeAbortSignalAny(): void {
  Object.defineProperty(AbortSignal, "any", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

describe("a caller's abort reaches the request", () => {
  it("cancels a GET passed a signal in the signal slot", async () => {
    const controller = new AbortController();
    const pending = apiClient.get("/things", undefined, controller.signal);

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("cancels a POST whose signal arrives on the request config", async () => {
    const controller = new AbortController();
    const pending = apiClient.post("/things", { a: 1 }, { signal: controller.signal });

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("honours a signal passed through init rather than shadowing it", async () => {
    const controller = new AbortController();
    const pending = authedFetch(
      "http://api.test/stream",
      { method: "POST", signal: controller.signal },
      "/stream",
    );

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("surfaces the cancellation as a typed ApiError, not a bare DOMException", async () => {
    const controller = new AbortController();
    const pending = apiClient.get("/things", undefined, controller.signal);

    await Promise.resolve();
    controller.abort();

    const error = await pending.then(
      () => {
        throw new Error("expected a rejection");
      },
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) throw new Error("unreachable");
    expect(error.code).toBe("ABORTED");
    expect(error.message).toBe("Request was cancelled.");
  });

  it("cancels immediately when the signal was already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiClient.get("/things", undefined, controller.signal),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
});

describe("without AbortSignal.any — Chrome <116, Safari <17.4, Firefox <124", () => {
  it("still cancels, instead of silently discarding the caller's signal", async () => {
    removeAbortSignalAny();
    expect(AbortSignal.any).toBeUndefined();

    const controller = new AbortController();
    const pending = apiClient.get("/things", undefined, controller.signal);

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("still cancels a signal delivered through init", async () => {
    removeAbortSignalAny();

    const controller = new AbortController();
    const pending = authedFetch(
      "http://api.test/stream",
      { method: "POST", signal: controller.signal },
      "/stream",
    );

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });
});

describe("what reaches fetch", () => {
  it("hands fetch a signal that is not the caller's own object", async () => {
    const controller = new AbortController();
    const pending = apiClient.get("/things", undefined, controller.signal);

    await untilRequestIssued();
    const call = calls.find((entry) => entry.url.includes("/things"));
    expect(call?.signal).toBeDefined();
    expect(call?.signal).not.toBe(controller.signal);

    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("aborts the signal fetch received when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = apiClient.get("/things", undefined, controller.signal);

    await untilRequestIssued();
    const call = calls.find((entry) => entry.url.includes("/things"));
    expect(call?.signal?.aborted).toBe(false);

    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    expect(call?.signal?.aborted).toBe(true);
  });

  it("does not leave a signal-free request when the caller passed none", async () => {
    installFetch((input, init) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) return Promise.resolve(SESSION_MISS);
      calls.push({ url, signal: init?.signal });
      return Promise.resolve(
        responseDouble({
          ok: true,
          status: 200,
          statusText: "OK",
          body: { success: true, data: { id: 1 } },
        }),
      );
    });

    await apiClient.get("/things");

    const call = calls.find((entry) => entry.url.includes("/things"));
    expect(call?.signal).toBeDefined();
  });
});
