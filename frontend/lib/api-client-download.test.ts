import { apiClient, isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";


if (typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = () => new AbortController().signal;
}

const SESSION_TOKEN_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({ backendJwt: null }),
};

function stubFetch(responder: (url: string, init: RequestInit) => unknown): jest.Mock {
  const mock = jest.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).includes("/api/auth/session")) return SESSION_TOKEN_RESPONSE;
    return responder(String(url), init ?? {});
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

function csvResponse(body: string) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "Content-Type": "text/csv" }),
    blob: async () => new Blob([body], { type: "text/csv" }),
    json: async () => {
      throw new SyntaxError("not json");
    },
  };
}

function refusal(status: number, body: unknown) {
  return {
    ok: false,
    status,
    statusText: "",
    headers: new Headers(),
    json: async () => body,
    blob: async () => new Blob([]),
  };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("apiClient.download — the request", () => {
  it("still sends a plain GET when no config is given", async () => {
    const fetchMock = stubFetch(() => csvResponse("a,b\n1,2\n"));

    await apiClient.download("/inventory/audit-export/jobs/4/download");

    const call = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/auth/session"));
    expect(call?.[1]?.method).toBe("GET");
    expect(call?.[1]?.body).toBeUndefined();
  });

  it("sends a JSON body when the file is the answer to a POST", async () => {
    const fetchMock = stubFetch(() => csvResponse("SKU,On hand\nSKU-1,4\n"));
    const spec = { report: "expiry", filters: { withinDays: 30 } };

    const blob = await apiClient.download("/inventory/ai/reports/export", undefined, {
      method: "POST",
      body: { spec },
    });

    const call = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/auth/session"));
    expect(call?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ spec });
    expect(new Headers(call?.[1]?.headers).get("Content-Type")).toBe("application/json");
    expect(blob.type).toBe("text/csv");
  });
});

describe("apiClient.download — the refusal", () => {
  it("surfaces the sentence the server wrote, not its reason phrase", async () => {
    stubFetch(() =>
      refusal(403, {
        statusCode: 403,
        error: "Forbidden",
        message: "Exporting this report requires inventory:audit:export",
      }),
    );

    await expect(
      apiClient.download("/inventory/ai/reports/export", undefined, {
        method: "POST",
        body: { spec: { report: "movements", filters: {} } },
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: "Exporting this report requires inventory:audit:export",
    });
  });

  it("throws an ApiError, so status and code survive to the call site", async () => {
    stubFetch(() => refusal(402, { message: "Out of credits", code: "CREDITS_EXHAUSTED" }));

    const error = await apiClient
      .download("/inventory/ai/reports/export")
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 402, code: "CREDITS_EXHAUSTED" });
  });

  it("carries the field-level issues through to getErrorMessage", async () => {
    stubFetch(() =>
      refusal(400, {
        message: "Validation failed.",
        details: [{ path: "spec.filters.withinDays", message: "Number must be less than 365" }],
      }),
    );

    const error = await apiClient
      .download("/inventory/ai/reports/export")
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    expect(getErrorMessage(error)).toBe(
      "spec.filters.withinDays: Number must be less than 365",
    );
  });
});
