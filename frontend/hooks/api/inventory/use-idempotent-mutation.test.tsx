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

/**
 * The contract is about which key reaches the server across a sequence of
 * attempts, so every test here asserts the sequence of keys rather than any one
 * of them.
 */
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
    // The case the fence exists for: submit, it fails, the operator presses
    // again. Both attempts must reach the server under one key, or the second
    // is a new command and creates a second document.
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
    // The inverse failure, and the one a naive "mint once per hook" would cause:
    // a create endpoint that can only ever create one thing per mounted form.
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
    // Same key + different body is 422 at the fence. Reusing the key here would
    // make correcting a form an unrecoverable error.
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
    // react-hook-form hands a fresh object to every submit and does not promise
    // key order. Comparing by identity, or by a plain JSON.stringify, would mint
    // a new key here and quietly restore the defect.
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
    // The wrapper replaces onSuccess to retire the key; a caller's own onSuccess
    // must still run, or every cache invalidation in the module stops firing.
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
