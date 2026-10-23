import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { useAddSignField, type CreateSignFieldInput } from "./fields";

jest.mock("@/hooks/api/inventory/use-idempotent-mutation", () => {
  const actual = jest.requireActual("@/hooks/api/inventory/use-idempotent-mutation");
  return { useAuthorizedIdempotentMutation: (_key: string, options: object) => actual.useIdempotentMutation(options) };
});

const post = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { post: (...args: unknown[]) => post(...args) } }));

const INPUT: CreateSignFieldInput = { documentId: 1, recipientId: 2, fieldType: "signature", pageNumber: 1, x: 10, y: 20, width: 30, height: 10 };

function keyOf(call: unknown[]): unknown {
  const init = call[2];
  return init && typeof init === "object" && "headers" in init ? init.headers : undefined;
}

function render() {
  const client = createAppQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useAddSignField(7), { wrapper });
}

describe("adding a field after a network error", () => {
  beforeEach(() => post.mockReset());

  it("retries once with the same Idempotency-Key, so the server never saves the field twice", async () => {
    post
      .mockRejectedValueOnce(new ApiError("Network error", undefined, "NETWORK_ERROR"))
      .mockResolvedValueOnce({ id: 9 });
    const { result } = render();

    await act(() => result.current.mutateAsync(INPUT));

    expect(post).toHaveBeenCalledTimes(2);
    expect(keyOf(post.mock.calls[0])).toEqual(keyOf(post.mock.calls[1]));
    expect(keyOf(post.mock.calls[0])).toEqual({ "Idempotency-Key": expect.any(String) });
  });

  it("does not retry a rejected field, such as a validation error", async () => {
    post.mockRejectedValueOnce(new ApiError("Bad field", 400, "BAD_REQUEST"));
    const { result } = render();

    await act(() => expect(result.current.mutateAsync(INPUT)).rejects.toThrow("Bad field"));

    expect(post).toHaveBeenCalledTimes(1);
  });
});
