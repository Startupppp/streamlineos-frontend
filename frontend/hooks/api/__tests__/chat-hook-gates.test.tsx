"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(false),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/ably", () => ({
  reauthorizeAblyClients: jest.fn(),
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(false);
  mockedGet.mockReturnValue(new Promise(() => {}));
  mockedPost.mockReturnValue(new Promise(() => {}));
  mockedPatch.mockReturnValue(new Promise(() => {}));
});

describe("chat read hooks — stay idle without permission", () => {
  it("useChatMessages — fetchStatus idle when chat:messages:read denied", async () => {
    const { useChatMessages } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    const { result } = renderHook(() => useChatMessages(1), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useChatChannels — fetchStatus idle when chat:channels:read denied", async () => {
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useActiveHuddle — fetchStatus idle when chat:channels:read denied", async () => {
    const { useActiveHuddle } = await import("@/hooks/api/chat-huddles");
    const client = freshClient();
    const { result } = renderHook(() => useActiveHuddle(5), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useEntityChannel — fetchStatus idle when chat:channels:read denied", async () => {
    const { useEntityChannel } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    const { result } = renderHook(() => useEntityChannel("project", "p-1"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useChannelInviteLink — fetchStatus idle when chat:invite-links:manage denied", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    const { result } = renderHook(() => useChannelInviteLink(5, true), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useLinkPreview — fetchStatus idle when chat:messages:read denied", async () => {
    const { useLinkPreview } = await import("@/hooks/api/chat-entities");
    const client = freshClient();
    const { result } = renderHook(() => useLinkPreview("https://example.com"), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useAiConversations — fetchStatus idle when ai:chat:use denied", async () => {
    const { useAiConversations } = await import("@/hooks/api/chat-ai-assistant");
    const client = freshClient();
    const { result } = renderHook(() => useAiConversations(true), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("useAiConversationMessages — fetchStatus idle when ai:chat:use denied", async () => {
    const { useAiConversationMessages } = await import("@/hooks/api/chat-ai-assistant");
    const client = freshClient();
    const { result } = renderHook(() => useAiConversationMessages(1, true), {
      wrapper: makeWrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe("chat mutation hooks — throw without permission", () => {
  it("useStartHuddle — throws when chat:huddles:start denied", async () => {
    const { useStartHuddle } = await import("@/hooks/api/chat-huddles");
    const client = freshClient();
    const { result } = renderHook(() => useStartHuddle(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(result.current.mutateAsync(1)).rejects.toThrow(
        "Missing permission: chat:huddles:start",
      );
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useJoinHuddle — throws when chat:channels:write denied", async () => {
    const { useJoinHuddle } = await import("@/hooks/api/chat-huddles");
    const client = freshClient();
    const { result } = renderHook(() => useJoinHuddle(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ huddleId: 1, channelId: 2 }),
      ).rejects.toThrow("Missing permission: chat:channels:write");
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useCreateAiConversation — throws when ai:chat:use denied", async () => {
    const { useCreateAiConversation } = await import("@/hooks/api/chat-ai-assistant");
    const client = freshClient();
    const { result } = renderHook(() => useCreateAiConversation(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(
        "Missing permission: ai:chat:use",
      );
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useMarkChannelRead — uses chat:messages:read key (not chat:channels:write)", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    const { result } = renderHook(() => useMarkChannelRead(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ channelId: 1 }),
      ).rejects.toThrow("Missing permission: chat:messages:read");
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useChatHeartbeat — uses chat:messages:read key (not chat:messages:write)", async () => {
    const { useChatHeartbeat } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    const { result } = renderHook(() => useChatHeartbeat(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        "Missing permission: chat:messages:read",
      );
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("useMarkChannelUnread — uses chat:messages:write key (not chat:channels:write)", async () => {
    const { useMarkChannelUnread } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    const { result } = renderHook(() => useMarkChannelUnread(), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await expect(result.current.mutateAsync(1)).rejects.toThrow(
        "Missing permission: chat:messages:write",
      );
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });
});

describe("chat read hooks — fire when permission granted", () => {
  it("useChatMessages — calls API when chat:messages:read granted", async () => {
    useCan.mockReturnValue(true);
    const { useChatMessages } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    renderHook(() => useChatMessages(1), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalled();
  });

  it("useActiveHuddle — calls API when chat:channels:read granted", async () => {
    useCan.mockReturnValue(true);
    const { useActiveHuddle } = await import("@/hooks/api/chat-huddles");
    const client = freshClient();
    renderHook(() => useActiveHuddle(5), { wrapper: makeWrapper(client) });
    expect(mockedGet).toHaveBeenCalled();
  });
});
