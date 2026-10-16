import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useCreateCalendarDeveloperCredential, useRevokeCalendarDeveloperCredential } from "./calendar-developer";

jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { permissions: ["calendar:admin:manage"] }, refetch: jest.fn() }),
}));
jest.mock("@/lib/api-envelope", () => ({
  isApiError: (error: unknown) => error instanceof Error && "status" in error,
  lazyContract: jest.fn((factory: () => unknown) => factory),
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function sentKeys(): string[] {
  return apiClient.post.mock.calls.map((call: unknown[]) =>
    (call[2] as { headers: Record<string, string> }).headers["Idempotency-Key"]);
}

describe("Calendar developer credential idempotency", () => {
  beforeEach(() => apiClient.post.mockReset());

  it("reuses the create key after an uncertain response and starts a new operation after success", async () => {
    apiClient.post
      .mockRejectedValueOnce(new Error("network interrupted"))
      .mockResolvedValue({ token: "one-time", credential: { id: "credential" } });
    const { result } = renderHook(() => useCreateCalendarDeveloperCredential(), { wrapper });
    const input = {
      name: "Integration",
      description: null,
      scopes: ["calendar:availability:read" as const],
      expiresAt: "2026-11-01T00:00:00.000Z",
    };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow("network interrupted");
    });
    await act(async () => { await result.current.mutateAsync(input); });
    await act(async () => { await result.current.mutateAsync(input); });

    const [first, second, third] = sentKeys();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it("reuses the revoke key after an uncertain response", async () => {
    apiClient.post
      .mockRejectedValueOnce(new Error("network interrupted"))
      .mockResolvedValue({ success: true });
    const { result } = renderHook(() => useRevokeCalendarDeveloperCredential(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("credential")).rejects.toThrow("network interrupted");
    });
    await act(async () => { await result.current.mutateAsync("credential"); });

    expect(sentKeys()[1]).toBe(sentKeys()[0]);
  });

  it("starts a new create operation after the backend reports an unrecoverable secret", async () => {
    const replay = Object.assign(new Error("Credential already created"), { status: 409 });
    apiClient.post.mockRejectedValueOnce(replay).mockResolvedValue({ token: "new", credential: { id: "next" } });
    const { result } = renderHook(() => useCreateCalendarDeveloperCredential(), { wrapper });
    const input = {
      name: "Integration",
      description: null,
      scopes: ["calendar:availability:read" as const],
      expiresAt: "2026-11-01T00:00:00.000Z",
    };

    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toBe(replay); });
    await act(async () => { await result.current.mutateAsync(input); });

    expect(sentKeys()[1]).not.toBe(sentKeys()[0]);
  });
});
