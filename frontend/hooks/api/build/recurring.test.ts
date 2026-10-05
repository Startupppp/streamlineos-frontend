import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { useSetRecurrence } from "./recurring";

jest.mock("@/lib/api-client", () => ({
  apiClient: { patch: jest.fn() },
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

it("sends the version token alongside the recurrence rule so the backend can detect stale writes", async () => {
  jest.mocked(apiClient.patch).mockResolvedValue({ updated: true, updatedAt: "2026-09-28T00:00:00Z", version: 2 });
  const { result } = renderHook(() => useSetRecurrence(42, 7), { wrapper: makeWrapper() });

  await act(async () => {
    await result.current.mutateAsync({
      version: 5,
      rule: { frequency: "weekly", interval: 1 },
    });
  });

  expect(apiClient.patch).toHaveBeenCalledTimes(1);
  const [, body] = (apiClient.patch as jest.Mock).mock.calls[0] as [string, Record<string, unknown>];
  expect(body).toMatchObject({ version: 5, isRecurring: true });
});

it("sends isRecurring=false and recurrenceRule=null when the rule is cleared", async () => {
  jest.mocked(apiClient.patch).mockResolvedValue({ updated: true, updatedAt: "2026-09-28T00:00:00Z", version: 3 });
  const { result } = renderHook(() => useSetRecurrence(42, 7), { wrapper: makeWrapper() });

  await act(async () => {
    await result.current.mutateAsync({ version: 5, rule: null });
  });

  const [, body] = (apiClient.patch as jest.Mock).mock.calls[0] as [string, Record<string, unknown>];
  expect(body).toMatchObject({ version: 5, isRecurring: false, recurrenceRule: null });
});
