import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { portalApiClient } from "@/lib/portal-api-client";
import { useSubmitChangeRequest } from "./use-submit-change-request";

jest.mock("@/lib/portal-api-client", () => ({
  portalApiClient: { post: jest.fn() },
}));

const post = jest.mocked(portalApiClient.post);
const input = {
  title: "Change the delivery date",
  description: "The launch window moved by two weeks.",
};

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function idempotencyKeys(): Array<string | undefined> {
  return post.mock.calls.map((call) => call[2]?.headers?.["Idempotency-Key"]);
}

describe("useSubmitChangeRequest", () => {
  beforeEach(() => post.mockReset());

  it("reuses the operation key after a failed submission", async () => {
    post.mockRejectedValue(new Error("timeout"));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useSubmitChangeRequest(7), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync(input).catch(() => undefined);
      await result.current.mutateAsync(input).catch(() => undefined);
    });

    const keys = idempotencyKeys();
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("retires the operation key after a successful submission", async () => {
    post.mockResolvedValue({ id: 1 });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useSubmitChangeRequest(7), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync(input);
      await result.current.mutateAsync(input);
    });

    const keys = idempotencyKeys();
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);
  });
});
