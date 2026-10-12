import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useSubmitPublicForm, submitPublicForm } from "@/hooks/api/build/public-form";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import { isApiError } from "@/lib/api-envelope";

const originalFetch = global.fetch;

function stubFetch(body: unknown, status = 200) {
  global.fetch = jest.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

function sentKeys(): (string | null)[] {
  return (global.fetch as jest.Mock).mock.calls.map((call) => {
    const [, init] = call as [string, RequestInit];
    return new Headers(init.headers).get(IDEMPOTENCY_HEADER);
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe("a retried public-form submit is the same operation, not a second submission", () => {
  it("sends an idempotency key, so a replayed POST can be recognised by the server", async () => {
    stubFetch({ success: true, data: { id: 1, message: "Submission received" } });
    const { result } = renderHook(() => useSubmitPublicForm("tok"), { wrapper });

    await act(async () => {
      result.current.mutate({ company: "Acme" });
    });

    expect(sentKeys()[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("reuses one key across retries of the same answers", async () => {
    stubFetch({ success: true, data: { id: 1, message: "Submission received" } });
    const { result } = renderHook(() => useSubmitPublicForm("tok"), { wrapper });

    await act(async () => {
      result.current.mutate({ company: "Acme" });
    });
    await act(async () => {
      result.current.mutate({ company: "Acme" });
    });

    const keys = sentKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
  });

  it("mints a new key once the answers change, so an edited submission is a new operation rather than a swallowed replay", async () => {
    stubFetch({ success: true, data: { id: 1, message: "Submission received" } });
    const { result } = renderHook(() => useSubmitPublicForm("tok"), { wrapper });

    await act(async () => {
      result.current.mutate({ company: "Acme" });
    });
    await act(async () => {
      result.current.mutate({ company: "Globex" });
    });

    const keys = sentKeys();
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[1]).toBeTruthy();
  });

  it("still carries the correlation header alongside the idempotency key", async () => {
    stubFetch({ success: true, data: { id: 1, message: "Submission received" } });

    await submitPublicForm("tok", { company: "Acme" }, { [IDEMPOTENCY_HEADER]: "k-1" });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = new Headers(init.headers);
    expect(headers.get(IDEMPOTENCY_HEADER)).toBe("k-1");
    expect(headers.get("x-correlation-id")).toBeTruthy();
  });
});

describe("a refused public-form read carries the status the page branches on", () => {
  it("rejects with an ApiError carrying 404 so a dead token is distinguishable from a server fault", async () => {
    stubFetch({ message: "Form not found or no longer active" }, 404);
    const { fetchPublicForm } = await import("@/hooks/api/build/public-form");

    await expect(fetchPublicForm("tok")).rejects.toMatchObject({
      status: 404,
      message: "Form not found or no longer active",
    });
  });

  it("rejects with an ApiError carrying 500 for a server fault, so the two are not one state", async () => {
    stubFetch({ message: "Internal server error" }, 500);
    const { fetchPublicForm } = await import("@/hooks/api/build/public-form");

    const error = await fetchPublicForm("tok").catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) ? error.status : undefined).toBe(500);
  });

  it("rejects a refused submit with the status too, not a bare Error", async () => {
    stubFetch({ message: "Form is not active", code: "BAD_REQUEST" }, 400);

    const error = await submitPublicForm("tok", {}).catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) ? error.status : undefined).toBe(400);
    expect(isApiError(error) ? error.code : undefined).toBe("BAD_REQUEST");
  });
});
