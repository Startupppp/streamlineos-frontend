/**
 * C031's test clause, made real on the frontend.
 *
 * "Each exception must be local, narrow, documented with the invariant and
 * covered by a negative/runtime contract test." The first three held here as
 * prose in `scripts/check-type-assertions.mjs`. The fourth held as nothing at
 * all: no ledger entry named a test, nothing checked that one existed, and a
 * written invariant that no test exercises is a comment.
 *
 * Every EXTERNAL entry in either ledger now names a test as `path::title`, and
 * the gate's self-test proves the file is on disk and still carries that title.
 * The tests below are the ones that had no home; entries whose invariant was
 * already exercised elsewhere point at that existing test instead.
 *
 * Each test drives the assertion's OWN invariant with a value that violates it.
 * A test that only feeds the happy shape proves nothing about a cast — the cast
 * is a claim about what happens when the shape is wrong.
 */

jest.mock("jose", () => ({
  decodeJwt: () => ({}),
  SignJWT: class {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() { return Promise.resolve(""); }
  },
}));

import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";
import { unwrapBackend } from "@/lib/auth-session";
import { useRequestSignOtp, useSignPublicSession } from "@/hooks/api/sign/public";
import type { SignPublicSession } from "@/types/sign";

describe("instrumentation.ts — patching the setTimeout overload set", () => {
  const realSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
    jest.resetModules();
  });

  function setNodeEnv(value: typeof process.env.NODE_ENV): void {
    process.env.NODE_ENV = value;
  }

  it("clamps a negative delay to zero instead of handing it to the platform", async () => {
    const previous = process.env.NODE_ENV;
    setNodeEnv("development");
    const seen: unknown[] = [];
    const spy = jest.fn((cb: () => void, ms?: number) => {
      seen.push(ms);
      cb();
      return 0;
    });
    Object.defineProperty(globalThis, "setTimeout", { value: spy, configurable: true, writable: true });

    const { register } = await import("@/instrumentation");
    await register();
    const fired = jest.fn();
    globalThis.setTimeout(fired, -5000);

    expect(seen).toEqual([0]);
    expect(fired).toHaveBeenCalled();
    setNodeEnv(previous);
  });

  it("keeps the original function's statics reachable through the prototype chain", async () => {
    const previous = process.env.NODE_ENV;
    setNodeEnv("development");
    const original = jest.fn(() => 0);
    Object.defineProperty(original, "__marker", { value: "kept", enumerable: true });
    Object.defineProperty(globalThis, "setTimeout", { value: original, configurable: true, writable: true });

    const { register } = await import("@/instrumentation");
    await register();

    expect(globalThis.setTimeout).not.toBe(original);
    expect(Object.getPrototypeOf(globalThis.setTimeout)).toBe(original);
    setNodeEnv(previous);
  });

  it("(negative) does not patch the global outside development", async () => {
    const previous = process.env.NODE_ENV;
    setNodeEnv("production");
    const original = jest.fn(() => 0);
    Object.defineProperty(globalThis, "setTimeout", { value: original, configurable: true, writable: true });

    const { register } = await import("@/instrumentation");
    await register();

    expect(globalThis.setTimeout).toBe(original);
    setNodeEnv(previous);
  });
});

describe("feedbucket network-capture — subclassing the XMLHttpRequest global", () => {
  it("installs a constructor that is still an XMLHttpRequest, and installs it once", async () => {
    jest.resetModules();
    const OrigXHR = window.XMLHttpRequest;
    const origFetch = window.fetch;
    window.fetch = jest.fn(() => Promise.resolve(new Response("{}")));
    const { initNetworkCapture } = await import("@/feedbucket-widget/src/network-capture");

    initNetworkCapture("https://widget.example");
    const afterFirst = window.XMLHttpRequest;

    expect(afterFirst).not.toBe(OrigXHR);
    expect(Object.getPrototypeOf(afterFirst)).toBe(OrigXHR);
    expect(new afterFirst()).toBeInstanceOf(OrigXHR);

    initNetworkCapture("https://widget.example");
    expect(window.XMLHttpRequest).toBe(afterFirst);

    window.XMLHttpRequest = OrigXHR;
    window.fetch = origFetch;
  });
});

describe("lib/auth-session — unwrapBackend on a body that is not the envelope", () => {
  it("returns the data of a success envelope", () => {
    expect(unwrapBackend({ success: true, data: { userId: "u1" } })).toEqual({ userId: "u1" });
  });

  it("(negative) does not unwrap when success is not literally true", () => {
    const body = { success: "true", data: { userId: "u1" } };
    expect(unwrapBackend(body)).toBe(body);
  });

  it("(negative) does not invent a data key that is absent", () => {
    const body = { success: true };
    expect(unwrapBackend(body)).toBe(body);
  });

  it("(negative) passes a null body through instead of throwing", () => {
    expect(unwrapBackend(null)).toBeNull();
  });
});

function stubFetch(body: unknown, status = 200): jest.Mock {
  const fn = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "Stubbed",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
      clone() { return this; },
    }),
  );
  Object.defineProperty(globalThis, "fetch", { value: fn, configurable: true, writable: true });
  return fn as unknown as jest.Mock;
}

describe("lib/portal-api-client — parsePortalResponse on a body that is not the envelope", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    Object.defineProperty(globalThis, "fetch", { value: realFetch, configurable: true, writable: true });
  });

  it("unwraps a success envelope to its data", async () => {
    const { portalApiClient } = await import("@/lib/portal-api-client");
    stubFetch({ success: true, data: { id: 4 } });
    await expect(portalApiClient.get("/portal/projects")).resolves.toEqual({ id: 4 });
  });

  it("(negative) returns the whole body when success is not literally true, instead of an undefined data", async () => {
    const { portalApiClient } = await import("@/lib/portal-api-client");
    const body = { success: 1, data: { id: 4 } };
    stubFetch(body);
    await expect(portalApiClient.get("/portal/projects")).resolves.toEqual(body);
  });

  it("(negative) falls back to the status line when the error body's message is not a string", async () => {
    const { portalApiClient } = await import("@/lib/portal-api-client");
    stubFetch({ message: 42, code: 7 }, 400);
    await expect(portalApiClient.get("/portal/projects")).rejects.toMatchObject({
      message: "400 Stubbed",
      code: undefined,
    });
  });

  it("(negative) survives an error body that is not JSON at all", async () => {
    const { portalApiClient } = await import("@/lib/portal-api-client");
    Object.defineProperty(globalThis, "fetch", {
      value: jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Server Error",
          headers: new Headers(),
          json: () => Promise.reject(new SyntaxError("not json")),
          clone() { return this; },
        }),
      ),
      configurable: true,
      writable: true,
    });
    await expect(portalApiClient.get("/portal/projects")).rejects.toMatchObject({
      message: "500 Server Error",
    });
  });
});

describe("features/build/intake/public-intake-api — the error-branch body probe", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    Object.defineProperty(globalThis, "fetch", { value: realFetch, configurable: true, writable: true });
  });

  it("surfaces a string message from the failure body", async () => {
    const { submitIntake } = await import("@/features/build/intake/public-intake-api");
    stubFetch({ message: "Intake is closed for this project" }, 400);
    await expect(
      submitIntake("1", { title: "t", submitterEmail: undefined }),
    ).rejects.toThrow("Intake is closed for this project");
  });

  it("(negative) falls back to the generic message when the body's message is not a string or a string array", async () => {
    const { submitIntake } = await import("@/features/build/intake/public-intake-api");
    stubFetch({ message: { nested: "object" } }, 400);
    await expect(
      submitIntake("1", { title: "t", submitterEmail: undefined }),
    ).rejects.toThrow("Failed to submit. Please try again.");
  });

  it("(negative) survives a failure body that is not JSON", async () => {
    const { submitIntake } = await import("@/features/build/intake/public-intake-api");
    Object.defineProperty(globalThis, "fetch", {
      value: jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          headers: new Headers(),
          json: () => Promise.reject(new SyntaxError("not json")),
          clone() { return this; },
        }),
      ),
      configurable: true,
      writable: true,
    });
    await expect(
      submitIntake("1", { title: "t", submitterEmail: undefined }),
    ).rejects.toThrow("Failed to submit. Please try again.");
  });
});

describe("lib/api-client — the 403 organization-access code probe", () => {
  const realFetch = globalThis.fetch;
  const realLocation = Object.getOwnPropertyDescriptor(window, "location");
  let replace: jest.Mock;

  beforeEach(() => {
    replace = jest.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/dashboard", href: "http://localhost/dashboard", replace },
      configurable: true,
    });
    // jsdom ships no AbortSignal.timeout. Without it `authedFetch` throws before
    // it ever calls fetch, and all three assertions below pass on a request that
    // never happened — a vacuous green this file exists to make impossible.
    if (typeof AbortSignal.timeout !== "function") {
      Object.defineProperty(AbortSignal, "timeout", {
        value: () => new AbortController().signal,
        configurable: true,
        writable: true,
      });
    }
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "fetch", { value: realFetch, configurable: true, writable: true });
    if (realLocation) Object.defineProperty(window, "location", realLocation);
    jest.resetModules();
  });

  async function get403(body: unknown): Promise<jest.Mock> {
    const { apiClient } = await import("@/lib/api-client");
    const fetchMock = stubFetch(body, 403);
    await expect(apiClient.get("/organization/members")).rejects.toBeDefined();
    // Anti-vacuity: the request must actually have been made. Every assertion
    // about the code guard is worthless if authedFetch threw before fetch.
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/organization/members")),
    ).toBe(true);
    return replace;
  }

  it("suspends the session when the body carries a known string code", async () => {
    await get403({ code: "ORG_MEMBERSHIP_SUSPENDED", message: "suspended" });
    expect(replace).toHaveBeenCalledWith("/access-suspended");
  });

  it("(negative) does not suspend on a code outside the organization-access set", async () => {
    // Two shapes, one guard. The `typeof body.code !== "string"` half of the
    // condition is what makes the cast's claim type-safe, but it discriminates
    // nothing at runtime — a Set of strings answers `has(403)` with false on its
    // own. What actually decides is set membership, so that is what this pins.
    await get403({ code: 403, message: "forbidden" });
    expect(replace).not.toHaveBeenCalled();

    jest.resetModules();
    replace.mockClear();
    await get403({ code: "SOME_UNRELATED_CODE", message: "forbidden" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("(negative) does not suspend on an ordinary 403 with no code at all", async () => {
    await get403({ message: "forbidden" });
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("hooks/api/sign/public — unwrap() on a body that is not the envelope", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    Object.defineProperty(globalThis, "fetch", { value: realFetch, configurable: true, writable: true });
  });

  function makeWrapper() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client }, children);
    };
  }

  async function readSession(body: unknown, status = 200): Promise<UseQueryResult<SignPublicSession>> {
    stubFetch(body, status);
    const { result } = renderHook(() => useSignPublicSession("tok"), { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    return result.current;
  }

  async function requestOtp(body: unknown, status = 200): Promise<ReturnType<typeof useRequestSignOtp>> {
    stubFetch(body, status);
    const { result } = renderHook(() => useRequestSignOtp("tok"), { wrapper: makeWrapper() });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => {
      expect(result.current.isIdle).toBe(false);
      expect(result.current.isPending).toBe(false);
    });
    return result.current;
  }

  it("unwraps a success envelope to its data", async () => {
    const sent = await requestOtp({ success: true, data: { sent: true } });
    expect(sent.data).toEqual({ sent: true });
  });

  it("(negative) returns the whole body when success is not literally true, instead of an undefined data", async () => {
    const body = { success: "true", data: { sent: true } };
    const sent = await requestOtp(body);
    expect(sent.data).toEqual(body);
  });

  it("(negative) does not invent a data key that is absent", async () => {
    const body = { success: true, sent: true };
    const sent = await requestOtp(body);
    expect(sent.data).toEqual(body);
  });

  it("(negative) keeps the backend message on a failure body, and the fallback when it is not a string", async () => {
    const named = await readSession({ message: "This signing link has expired." }, 410);
    expect(named.error).toMatchObject({ message: "This signing link has expired." });
    const unnamed = await readSession({ message: { nested: true } }, 410);
    expect(unnamed.error).toMatchObject({ message: "This signing link is invalid." });
  });
});
