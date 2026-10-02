jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  ...jest.requireActual<typeof import("@/lib/api-envelope")>(
    "@/lib/api-envelope",
  ),
  lazyContract: jest.fn((fn: () => unknown) => fn),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: false, scopes: {}, modules: {} },
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } =
        jest.requireActual<typeof import("@tanstack/react-query")>(
          "@tanstack/react-query",
        );
      return useMutation(options);
    },
  ),
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useDeleteMessage } from "@/hooks/api/chat-core-mutations-a";
import { toast } from "sonner";

const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;
const toastError = (toast as unknown as { error: jest.Mock }).error;

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useDeleteMessage — error feedback", () => {
  beforeEach(() => {
    mockDelete.mockReset();
    toastError.mockClear();
  });

  it("failing to delete a message calls toast.error so the user knows the action did not succeed", async () => {
    mockDelete.mockRejectedValue(new Error("Forbidden"));
    const { result } = renderHook(() => useDeleteMessage(), {
      wrapper: makeWrapper(),
    });
    act(() => {
      result.current.mutate({ channelId: 1, messageId: 2 });
    });
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
