import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import {
  isContractViolation,
  lazyContract,
  resolveContract,
} from "@/lib/api-envelope";

/**
 * The bite-proof for deferring the contract MODULE without deferring the
 * CONTRACT. `check:response-contracts` can only see that an argument sits in
 * the contract slot; it cannot see whether that argument is still applied at
 * runtime. A thunk that resolved to `undefined`, or one the client forgot to
 * await, would pass the gate and silently turn every deferred read back into
 * the unchecked cast the gate exists to stop.
 *
 * So this drives the real `apiClient` against a real `fetch` double and asserts
 * on what the read RETURNS or THROWS — the shape the AGENT-BRIEF's rule 11 asks
 * for — with the loader counted so "loaded once, and not before the first
 * request" is measured rather than asserted in prose.
 */

interface ResponseFields {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: unknown;
}

function responseDouble(fields: ResponseFields): Response {
  return {
    ok: fields.ok,
    status: fields.status,
    statusText: fields.statusText ?? "",
    json: async () => fields.body,
  } as Response;
}

const SESSION_MISS = responseDouble({ ok: false, status: 401 });

function fetchReturning(body: unknown): typeof fetch {
  return (input) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve(SESSION_MISS);
    return Promise.resolve(responseDouble({ ok: true, status: 200, body }));
  };
}

const widgetContract = z.object({
  id: z.string(),
  count: z.number(),
});

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("a lazily-loaded contract still validates the response", () => {
  it("rejects a drifted body exactly as an eager contract would", async () => {
    global.fetch = fetchReturning({ id: "w1", total: 3 });
    const contract = lazyContract(() => Promise.resolve(widgetContract));

    const error = await apiClient
      .get("/widgets", undefined, undefined, contract)
      .catch((caught: unknown) => caught);

    expect(isContractViolation(error)).toBe(true);
  });

  it("names the missing field in the violation, so the drift is diagnosable", async () => {
    global.fetch = fetchReturning({ id: "w1", total: 3 });
    const contract = lazyContract(() => Promise.resolve(widgetContract));

    const error = await apiClient
      .get("/widgets", undefined, undefined, contract)
      .catch((caught: unknown) => caught);

    expect(isContractViolation(error)).toBe(true);
    if (!isContractViolation(error)) throw new Error("expected a violation");
    expect(error.resource).toBe("/widgets");
    expect(error.issues.map((issue) => issue.path)).toContain("count");
  });

  it("returns the parsed body when the response matches", async () => {
    global.fetch = fetchReturning({ id: "w1", count: 3, extra: "additive" });
    const contract = lazyContract(() => Promise.resolve(widgetContract));

    await expect(
      apiClient.get("/widgets", undefined, undefined, contract),
    ).resolves.toEqual({ id: "w1", count: 3 });
  });

  it("validates a WRITE response too — the switch-org shape is a mutation", async () => {
    global.fetch = fetchReturning({ id: "w1" });
    const contract = lazyContract(() => Promise.resolve(widgetContract));

    const error = await apiClient
      .post("/widgets", { name: "w" }, undefined, contract)
      .catch((caught: unknown) => caught);

    expect(isContractViolation(error)).toBe(true);
  });

  it("still casts unchecked when no contract is passed — the gap the gate counts", async () => {
    global.fetch = fetchReturning({ id: "w1", total: 3 });

    await expect(apiClient.get("/widgets")).resolves.toEqual({
      id: "w1",
      total: 3,
    });
  });
});

describe("lazyContract loads the schema module once, and not before it is needed", () => {
  it("has not loaded anything until the first request runs", async () => {
    const load = jest.fn(() => Promise.resolve(widgetContract));
    const contract = lazyContract(load);

    expect(load).not.toHaveBeenCalled();

    global.fetch = fetchReturning({ id: "w1", count: 1 });
    await apiClient.get("/widgets", undefined, undefined, contract);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("loads once across many reads, so a composed schema is built once", async () => {
    const load = jest.fn(() => Promise.resolve(widgetContract));
    const contract = lazyContract(load);
    global.fetch = fetchReturning({ id: "w1", count: 1 });

    await apiClient.get("/widgets", undefined, undefined, contract);
    await apiClient.get("/widgets", undefined, undefined, contract);
    await apiClient.get("/widgets", undefined, undefined, contract);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed load, so a retry after a chunk failure can succeed", async () => {
    const load = jest
      .fn<Promise<typeof widgetContract>, []>()
      .mockRejectedValueOnce(new Error("Loading chunk 42 failed"))
      .mockResolvedValue(widgetContract);
    const contract = lazyContract(load);
    global.fetch = fetchReturning({ id: "w1", count: 1 });

    await expect(
      apiClient.get("/widgets", undefined, undefined, contract),
    ).rejects.toThrow("Loading chunk 42 failed");

    await expect(
      apiClient.get("/widgets", undefined, undefined, contract),
    ).resolves.toEqual({ id: "w1", count: 1 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("a failed load fails the read rather than letting an unparsed body through", async () => {
    const contract = lazyContract<{ id: string; count: number }>(() =>
      Promise.reject(new Error("Loading chunk 42 failed")),
    );
    global.fetch = fetchReturning({ id: "w1", total: 3 });

    await expect(
      apiClient.get("/widgets", undefined, undefined, contract),
    ).rejects.toThrow("Loading chunk 42 failed");
  });
});

describe("resolveContract discriminates a schema from a loader", () => {
  it("passes a Zod schema through untouched — a schema is an object, never callable", async () => {
    await expect(resolveContract(widgetContract)).resolves.toBe(widgetContract);
  });

  it("calls a loader and yields what it resolves to", async () => {
    await expect(
      resolveContract(lazyContract(() => Promise.resolve(widgetContract))),
    ).resolves.toBe(widgetContract);
  });

  it("yields undefined for an absent contract, keeping the unchecked path reachable", async () => {
    await expect(resolveContract(undefined)).resolves.toBeUndefined();
  });
});
