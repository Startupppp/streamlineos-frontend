import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { useJoinChannel } from "@/hooks/api/chat-core-mutations-b";
import { readChannelJoinRequired } from "./chat-helpers";
import { ChannelJoinState } from "./channel-join-state";
import { CHANNEL_ID, ids, leaveSpy, message, positioned, useHarness } from "./use-message-timeline-test-harness";

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

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() }),
}));

const mockedGet = jest.mocked(apiClient.get);
const mockedPost = jest.mocked(apiClient.post);

function joinRequired() {
  return new ApiError("Join this channel to read it", 403, "CHAT_CHANNEL_JOIN_REQUIRED", {
    channelId: String(CHANNEL_ID),
    channelName: "general",
  });
}

let joined = false;

function routeGet(path: string): Promise<unknown> {
  if (!joined) return Promise.reject(joinRequired());
  if (path.endsWith("/context"))
    return Promise.resolve({ messages: [positioned(40), positioned(41), positioned(42)], targetMessageId: 41, olderCursor: null, hasNewer: true });
  if (path.endsWith("/messages")) return Promise.resolve({ messages: [message(100)], nextCursor: null });
  return Promise.reject(new Error(`unexpected GET ${path}`));
}

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  joined = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockedGet.mockImplementation(routeGet);
  mockedPost.mockImplementation(() => {
    joined = true;
    return Promise.resolve({ ok: true });
  });
});

describe("readChannelJoinRequired", () => {
  it("reads the channel name from a public non-member refusal", () => {
    expect(readChannelJoinRequired(joinRequired())).toEqual({ channelName: "general" });
  });

  it("treats every other 403 as an ordinary refusal, since private channels never reveal a name", () => {
    expect(readChannelJoinRequired(new ApiError("You are not a member of this channel", 403))).toBeNull();
    expect(readChannelJoinRequired(new Error("boom"))).toBeNull();
  });
});

describe("ChannelJoinState", () => {
  it("offers Join #<channel> and joins that channel", async () => {
    render(<ChannelJoinState channelId={CHANNEL_ID} channelName="general" />, { wrapper: Wrapper });
    act(() => {
      screen.getByRole("button", { name: "Join #general" }).click();
    });
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith(`/chat/channels/${CHANNEL_ID}/join`, undefined, undefined, expect.anything()));
  });
});

describe("a mentioned non-member opening a public channel link", () => {
  function useJoinFlow() {
    return { ...useHarness(41), join: useJoinChannel() };
  }

  it("keeps ?message instead of calling the message gone, then lands on it once the reader joins", async () => {
    const { result } = renderHook(useJoinFlow, { wrapper: Wrapper });
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith(`/chat/channels/${CHANNEL_ID}/messages/41/context`, undefined, expect.anything(), expect.anything()));
    await waitFor(() => expect(result.current.timeline.list.isLoading).toBe(false));
    expect(toast.error).not.toHaveBeenCalled();
    expect(leaveSpy).not.toHaveBeenCalled();
    expect(result.current.anchor).toBe(41);

    await act(async () => {
      await result.current.join.mutateAsync(CHANNEL_ID);
    });
    await waitFor(() => expect(ids(result)).toEqual([40, 41, 42]));
    expect(result.current.anchor).toBe(41);
  });
});
