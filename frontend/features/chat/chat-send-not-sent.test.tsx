import { act, renderHook, waitFor } from "@testing-library/react";
import { onlineManager, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { UNSCOPED } from "@/lib/org-scoped-storage";
import { chatSendRetry } from "@/hooks/api/chat-send-policy";
import {
  channelRow,
  freshClient,
  installRandomUuid,
  message,
  messagesKey,
  myChannelsKey,
  seedChannels,
  seedTimeline,
  timeline,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";
import type { Channel, ChannelPage, MessagesPage } from "@/types/chat";
import { appendOutboxEntry, chatDraftKey, readOutbox } from "./composer-draft";
import { retryFailedSend } from "./chat-outbox-delivery";
import { mergeInboundMessage } from "./message-page-merge";
import { useChatOutboxDrain } from "./use-chat-offline-queue";
import { DRAFT_KEY, mockedPost, mount, readBody, sendCalls, typeAndSend } from "./chat-send-outbox-test-harness";

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

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

installRandomUuid();

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  onlineManager.setOnline(true);
});

function ghost(clientKey: string) {
  return message({ id: -5, senderId: "user-1", content: "hello", clientKey });
}

function saved(clientKey: string) {
  return message({ id: 900, senderId: "user-1", content: "hello", clientKey });
}

function page(messages: ReturnType<typeof message>[]): InfiniteData<MessagesPage> {
  return { pages: [{ messages, nextCursor: null }], pageParams: [undefined] };
}

function channelPage(channels: Channel[]): InfiniteData<ChannelPage<Channel>> {
  return { pages: [{ channels, nextCursor: null }], pageParams: [null] };
}

describe("a Not sent copy of a message the server already saved", () => {
  it("history that contains the clientKey drops the failed outbox entry and its Not sent row", async () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    const client = freshClient();
    seedTimeline(client, []);
    mount(client, true);
    await waitFor(() => expect(timeline(client).map((m) => m.id)).toEqual([expect.any(Number)]));
    expect(timeline(client)[0].id).toBeLessThan(0);

    act(() => {
      client.setQueryData(messagesKey, page([ghost("k-1"), saved("k-1")]));
    });

    await waitFor(() => expect(timeline(client).map((m) => m.id)).toEqual([900]));
    expect(readOutbox(DRAFT_KEY)).toEqual([]);
    expect(sendCalls()).toHaveLength(0);
  });

  it("negative control: history without the clientKey keeps the failed entry and its row", async () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    const client = freshClient();
    seedTimeline(client, []);
    mount(client, true);

    act(() => {
      client.setQueryData(messagesKey, page([saved("k-other")]));
    });

    await waitFor(() => expect(timeline(client).map((m) => m.clientKey)).toEqual(["k-other", "k-1"]));
    expect(readOutbox(DRAFT_KEY)).toEqual([expect.objectContaining({ clientKey: "k-1", failed: true })]);
  });

  it("a realtime echo of a saved message removes a lingering optimistic copy", () => {
    const merged = mergeInboundMessage(page([saved("k-1"), ghost("k-1")]), saved("k-1"), "k-1");

    expect(merged.pages[0].messages.map((m) => m.id)).toEqual([900]);
  });

  it("a send that errors after the echo already landed is settled as delivered, not Not sent", async () => {
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockImplementation(async (_url, body) => {
      const clientKey = readBody(body).clientKey ?? "";
      client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) =>
        old ? mergeInboundMessage(old, saved(clientKey), clientKey) : old,
      );
      throw new ApiError("Payload rejected", 422, "VALIDATION_ERROR");
    });
    const tab = mount(client, true);

    await typeAndSend(tab, "hello");

    await waitFor(() => expect(readOutbox(DRAFT_KEY)).toEqual([]));
    expect(timeline(client).map((m) => m.id)).toEqual([900]);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("Retry-After on transient errors", () => {
  it("caps a 5xx Retry-After at 30s", () => {
    const unavailable = new ApiError("Unavailable", 503, "INTERNAL", { retryAfterSecs: 3600 });
    expect(chatSendRetry.retryDelay(0, unavailable)).toBe(30_000);
    expect(chatSendRetry.retryDelay(0, new ApiError("Unavailable", 503, "INTERNAL", { retryAfterSecs: 5 }))).toBe(5_000);
  });

  it("caps a network or 408 Retry-After at 30s", () => {
    expect(chatSendRetry.retryDelay(0, new ApiError("Timeout", 408, "TIMEOUT", { retryAfterSecs: 600 }))).toBe(30_000);
    expect(
      chatSendRetry.retryDelay(0, new ApiError("Network error", undefined, "NETWORK_ERROR", { retryAfterSecs: 600 })),
    ).toBe(30_000);
  });

  it("negative control: a 429 Retry-After is honoured without a cap", () => {
    const limited = new ApiError("Too many requests", 429, "RATE_LIMITED", { retryAfterSecs: 3600 });
    expect(chatSendRetry.retryDelay(0, limited)).toBe(3_600_000);
  });
});

describe("drain failure toasts name the conversation", () => {
  it("names the channel from the cached channel list", async () => {
    mockedPost.mockRejectedValue(new ApiError("Payload rejected", 422, "VALIDATION_ERROR"));
    const client = freshClient();
    seedChannels(client, [channelRow({ id: 9, name: "design" })]);
    appendOutboxEntry(chatDraftKey(9, UNSCOPED), { content: "queued", clientKey: "k-queued" });

    renderHook(useChatOutboxDrain, { wrapper: wrapperFor(client) });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Message to #design not sent", { description: "Payload rejected" }));
  });

  it("falls back to a generic name when the channel is not cached", async () => {
    mockedPost.mockRejectedValue(new ApiError("Payload rejected", 422, "VALIDATION_ERROR"));
    appendOutboxEntry(chatDraftKey(9, UNSCOPED), { content: "queued", clientKey: "k-queued" });

    renderHook(useChatOutboxDrain, { wrapper: wrapperFor(freshClient()) });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Message to a conversation not sent", { description: "Payload rejected" }),
    );
  });

  async function retryAfterRejection(client: ReturnType<typeof freshClient>, rejection: ApiError) {
    mockedPost.mockRejectedValue(rejection);
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    seedTimeline(client, []);
    mount(client, true);
    await waitFor(() => expect(timeline(client)).toHaveLength(1));
    act(() => {
      retryFailedSend(DRAFT_KEY, "k-1");
    });
    await waitFor(() => expect(mockedPost).toHaveBeenCalled());
  }

  it.each([403, 404])("a %i while the channel is still listed keeps the message as Not sent", async (status) => {
    const client = freshClient();
    client.setQueryDefaults(myChannelsKey, { queryFn: async () => channelPage([channelRow({ name: "general" })]) });
    seedChannels(client, [channelRow({ name: "general" })]);

    await retryAfterRejection(client, new ApiError("Reply parent gone", status, "CHAT_REPLY_PARENT_MISSING"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Message to #general not sent", { description: "Reply parent gone" }));
    expect(readOutbox(DRAFT_KEY)).toEqual([expect.objectContaining({ clientKey: "k-1", content: "hello", failed: true })]);
    expect(timeline(client).map((m) => m.content)).toEqual(["hello"]);
  });

  it("a 403 after the refetched channel list no longer has the channel discards with a named toast", async () => {
    const client = freshClient();
    client.setQueryDefaults(myChannelsKey, { queryFn: async () => channelPage([]) });
    seedChannels(client, [channelRow({ name: "general" })]);

    await retryAfterRejection(client, new ApiError("No access", 403, "FORBIDDEN"));

    await waitFor(() => expect(readOutbox(DRAFT_KEY)).toEqual([]));
    expect(timeline(client)).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith("Message to #general discarded", { description: "No access" });
  });

  it("a join-required rejection discards even without a cached channel list", async () => {
    const client = freshClient();

    await retryAfterRejection(client, new ApiError("Join the channel first", 403, "CHAT_CHANNEL_JOIN_REQUIRED"));

    await waitFor(() => expect(readOutbox(DRAFT_KEY)).toEqual([]));
    expect(toast.error).toHaveBeenCalledWith("Message to a conversation discarded", { description: "Join the channel first" });
  });

  it("negative control: a 403 with no cached channel list keeps the message as Not sent", async () => {
    const client = freshClient();

    await retryAfterRejection(client, new ApiError("No access", 403, "FORBIDDEN"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Message to a conversation not sent", { description: "No access" }));
    expect(readOutbox(DRAFT_KEY)).toEqual([expect.objectContaining({ clientKey: "k-1", failed: true })]);
  });
});
