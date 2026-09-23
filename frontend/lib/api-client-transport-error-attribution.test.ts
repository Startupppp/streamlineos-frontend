import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

import { apiClient, buildUrl, clearBackendTokenCache, isApiError } from "@/lib/api-client";

const CONFIGURED_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://api.test").replace(/\/$/, "");
const CONFIGURED_HOST = new URL(CONFIGURED_BASE).host;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

beforeEach(() => {
  clearBackendTokenCache();
});

describe("a transport failure names the endpoint it failed against", () => {
  it("carries endpoint, host, method and the browser's own cause, so a user report is diagnosable", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/session")) return jsonResponse(200, {});
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const error: unknown = await apiClient
      .patch("/access/org-modules/crm", { enabled: false })
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) throw new Error("expected an ApiError");
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.endpoint).toBe("/access/org-modules/crm");
    expect(error.details).toMatchObject({
      method: "PATCH",
      path: "/access/org-modules/crm",
      host: CONFIGURED_HOST,
      cause: "Failed to fetch",
    });
  });

  it("does not relabel a non-fetch failure as a network error against the API host", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/session")) return jsonResponse(200, {});
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("body stream already read");
        },
        text: async () => {
          throw new Error("body stream already read");
        },
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const error: unknown = await apiClient
      .patch("/access/org-modules/crm", { enabled: false })
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    expect(isApiError(error) && error.code === "NETWORK_ERROR").toBe(false);
  });
});

describe("the API base url is normalised so a configured trailing slash cannot double it", () => {
  it("builds a single-slash path regardless of how NEXT_PUBLIC_API_URL was written", () => {
    expect(buildUrl("/access/org-modules/crm")).toBe(`${CONFIGURED_BASE}/access/org-modules/crm`);
  });
});
