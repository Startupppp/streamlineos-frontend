import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import {
  CHANNEL_ID,
  freshClient,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: true }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_scope: string, options: unknown) => useMutation(options) };
});

jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));

const mockedPost = jest.mocked(apiClient.post);
const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
});

describe("useChannelInviteLink mints through a mutation, never a POST inside a query", () => {
  it("mints once when enabled and returns the token in the same { data, isLoading } shape", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    mockedPost.mockResolvedValue({ token: "tok-1" });
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual({ token: "tok-1" }));
    expect(result.current.isLoading).toBe(false);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost.mock.calls[0][0]).toBe(`/chat/channels/${CHANNEL_ID}/invite-link`);
  });

  it("useRegenerateInviteLink writes the new token in place without re-minting", async () => {
    const { useChannelInviteLink, useRegenerateInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    mockedPost.mockResolvedValueOnce({ token: "tok-1" }).mockResolvedValueOnce({ token: "tok-2" });
    const link = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(link.result.current.data).toEqual({ token: "tok-1" }));
    const regenerate = renderHook(() => useRegenerateInviteLink(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await regenerate.result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    await waitFor(() => expect(link.result.current.data).toEqual({ token: "tok-2" }));
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it("mints once under StrictMode's double effect run", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const { StrictMode, createElement } = await import("react");
    const client = freshClient();
    mockedPost.mockResolvedValue({ token: "tok-1", expiresAt: null, maxUses: null, useCount: 0 });
    const Inner = wrapperFor(client);
    function Strict({ children }: { children: ReactNode }) {
      return createElement(StrictMode, null, createElement(Inner, null, children));
    }
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: Strict });
    await waitFor(() => expect(result.current.data?.token).toBe("tok-1"));
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("re-mints after the server expiry, but never sooner than 30s after the last mint", async () => {
    jest.useFakeTimers();
    try {
      const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
      const client = freshClient();
      mockedPost
        .mockResolvedValueOnce({ token: "tok-1", expiresAt: new Date(Date.now() + 50).toISOString(), maxUses: null, useCount: 0 })
        .mockResolvedValueOnce({ token: "tok-2", expiresAt: null, maxUses: null, useCount: 0 });
      const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10);
      });
      expect(result.current.data?.token).toBe("tok-1");
      await act(async () => {
        await jest.advanceTimersByTimeAsync(29_000);
      });
      expect(mockedPost).toHaveBeenCalledTimes(1);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2_000);
      });
      expect(mockedPost).toHaveBeenCalledTimes(2);
      expect(result.current.data?.token).toBe("tok-2");
    } finally {
      jest.useRealTimers();
    }
  });

  it("stops re-minting when the server answers with the same expiry, so a skewed client clock cannot loop", async () => {
    jest.useFakeTimers();
    try {
      const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
      const client = freshClient();
      const skewed = { token: "tok-s", expiresAt: new Date(Date.now() - 60_000).toISOString(), maxUses: null, useCount: 0 };
      mockedPost.mockResolvedValue(skewed);
      renderHook(() => useChannelInviteLink(CHANNEL_ID + 1, true), { wrapper: wrapperFor(client) });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10 * 60_000);
      });
      expect(mockedPost).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not mint when the viewer cannot manage invite links", async () => {
    useCan.mockReturnValue(false);
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), {
      wrapper: wrapperFor(freshClient()),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
