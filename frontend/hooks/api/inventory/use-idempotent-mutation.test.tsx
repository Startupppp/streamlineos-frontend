import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useIdempotentMutation } from "./use-idempotent-mutation";

function createClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function renderIdempotent(fn: jest.Mock) {
  const client = createClient();
  return renderHook(
    () =>
      useIdempotentMutation<{ id: number }, Error, Record<string, unknown>>({
        mutationFn: (variables, idempotencyKey) =>
          fn(variables, idempotencyKey) as Promise<{ id: number }>,
      }),
    { wrapper: wrapperFor(client) },
  );
}

const keysFrom = (fn: jest.Mock): string[] => fn.mock.calls.map((c) => c[1] as string);

describe("useIdempotentMutation", () => {
  it("sends one key for repeated attempts at the same intent", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("timeout"));
    const { result } = renderIdempotent(fn);

    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" }).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" }).catch(() => undefined);
    });

    const keys = keysFrom(fn);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toBeTruthy();
  });

  it("retires the key once the intent succeeds, so the next create is a new document", async () => {
    const fn = jest.fn().mockResolvedValue({ id: 1 });
    const { result } = renderIdempotent(fn);

    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" });
    });
    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" });
    });

    const keys = keysFrom(fn);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("mints a new key when the operator corrects the payload after a failure", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("bad request"));
    const { result } = renderIdempotent(fn);

    await act(async () => {
      await result.current.mutateAsync({ name: "Widgit" }).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" }).catch(() => undefined);
    });

    const keys = keysFrom(fn);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("treats a payload rebuilt in a different property order as the same payload", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("timeout"));
    const { result } = renderIdempotent(fn);

    await act(async () => {
      await result.current.mutateAsync({ name: "W", sku: "S" }).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync({ sku: "S", name: "W" }).catch(() => undefined);
    });

    const keys = keysFrom(fn);
    expect(keys[0]).toBe(keys[1]);
  });

  it("still reports the mutation result to the caller", async () => {
    const fn = jest.fn().mockResolvedValue({ id: 7 });
    const onSuccess = jest.fn();
    const client = createClient();
    const { result } = renderHook(
      () =>
        useIdempotentMutation<{ id: number }, Error, Record<string, unknown>>({
          mutationFn: (v, k) => fn(v, k) as Promise<{ id: number }>,
          onSuccess,
        }),
      { wrapper: wrapperFor(client) },
    );

    await act(async () => {
      await result.current.mutateAsync({ name: "Widget" });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(result.current.data).toEqual({ id: 7 });
  });
});
