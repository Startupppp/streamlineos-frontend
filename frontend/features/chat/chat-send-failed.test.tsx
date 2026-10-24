import { act, renderHook, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { UNSCOPED } from "@/lib/org-scoped-storage";
import { chatSendRetry } from "@/hooks/api/chat-send-policy";
import { useSendMessage } from "@/hooks/api/chat-message-mutations";
import { freshClient, installRandomUuid, seedTimeline, timeline, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import { appendOutboxEntry, chatDraftKey, readOutbox } from "./composer-draft";
import { discardFailedSend } from "./chat-outbox-delivery";
import { useChatOutboxDrain } from "./use-chat-offline-queue";
import { DRAFT_KEY, delivered, isSendUrl, mockedPost, mount, readBody, sendCalls, serverRow, typeAndSend } from "./chat-send-outbox-test-harness";

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

function serverError(status: number): ApiError {
  return new ApiError("Server error", status, "INTERNAL");
}

describe("send retry policy", () => {
  it("retries a 5xx or network failure up to 8 attempts in total, then stops", () => {
    expect(chatSendRetry.retry(6, serverError(503))).toBe(true);
    expect(chatSendRetry.retry(7, serverError(503))).toBe(false);
    expect(chatSendRetry.retry(6, new ApiError("Network error", undefined, "NETWORK_ERROR"))).toBe(true);
    expect(chatSendRetry.retry(7, new ApiError("Network error", undefined, "NETWORK_ERROR"))).toBe(false);
  });

  it("retries a 429 without limit and a terminal 4xx never", () => {
    const limited = new ApiError("Too many requests", 429, "RATE_LIMITED", { retryAfterSecs: 1 });
    expect(chatSendRetry.retry(500, limited)).toBe(true);
    expect(chatSendRetry.retry(0, new ApiError("Forbidden", 403, "FORBIDDEN"))).toBe(false);
    expect(chatSendRetry.retry(0, new ApiError("Timeout", 408, "TIMEOUT"))).toBe(true);
  });

  it("honours a Retry-After beyond 60s and caps exponential backoff at 30s", () => {
    const limited = new ApiError("Too many requests", 429, "RATE_LIMITED", { retryAfterSecs: 120 });
    expect(chatSendRetry.retryDelay(0, limited)).toBe(120_000);
    expect(chatSendRetry.retryDelay(10, serverError(500))).toBe(30_000);
  });
});

describe("rate limiting does not spend the transient retry budget", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("12 x 429, then 5 x 503, then success: the message is delivered, not FAILED", async () => {
    jest.useFakeTimers();
    const replies = [
      ...Array.from({ length: 12 }, () => new ApiError("Too many requests", 429, "RATE_LIMITED", { retryAfterSecs: 1 })),
      ...Array.from({ length: 5 }, () => serverError(503)),
    ];
    mockedPost.mockImplementation(async (url, body) => {
      const next = replies.shift();
      if (next) throw next;
      return serverRow(readBody(body));
    });
    const client = freshClient();
    seedTimeline(client, []);
    const { result } = renderHook(useSendMessage, { wrapper: wrapperFor(client) });
    let outcome: "pending" | "delivered" | "failed" = "pending";

    act(() => {
      result.current
        .mutateAsync({ channelId: 7, content: "burst", clientKey: "k-burst" })
        .then(() => (outcome = "delivered"), () => (outcome = "failed"));
    });
    for (let step = 0; step < 40 && outcome === "pending"; step += 1)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30_000);
      });

    expect(outcome).toBe("delivered");
    expect(sendCalls()).toHaveLength(18);
  });

  it("negative control: 8 x 503 with no 429 exhausts the budget and fails", async () => {
    jest.useFakeTimers();
    mockedPost.mockRejectedValue(serverError(503));
    const client = freshClient();
    seedTimeline(client, []);
    const { result } = renderHook(useSendMessage, { wrapper: wrapperFor(client) });
    let outcome: "pending" | "delivered" | "failed" = "pending";

    act(() => {
      result.current
        .mutateAsync({ channelId: 7, content: "down", clientKey: "k-down" })
        .then(() => (outcome = "delivered"), () => (outcome = "failed"));
    });
    for (let step = 0; step < 40 && outcome === "pending"; step += 1)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30_000);
      });

    expect(outcome).toBe("failed");
    expect(sendCalls()).toHaveLength(8);
  });
});

describe("a failed send leaves the channel queue", () => {
  it("a terminally failed message does not block a later message in the same channel", async () => {
    mockedPost.mockImplementation(async (url, body) => {
      if (!isSendUrl(String(url))) return undefined;
      const sent = readBody(body);
      if (sent.content === "rejected") throw new ApiError("Payload rejected", 422, "VALIDATION_ERROR");
      return serverRow(sent);
    });
    const client = freshClient();
    seedTimeline(client, []);
    const tab = mount(client, true);

    await typeAndSend(tab, "rejected");
    await typeAndSend(tab, "next one");

    await waitFor(() => expect(delivered(timeline(client)).map((m) => m.content)).toEqual(["next one"]));
    expect(readOutbox(DRAFT_KEY)).toEqual([expect.objectContaining({ content: "rejected", failed: true })]);
    expect(timeline(client).map((m) => m.content)).toEqual(["rejected", "next one"]);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("Discard removes the failed message from the outbox and the list", async () => {
    mockedPost.mockRejectedValue(new ApiError("Forbidden", 403, "FORBIDDEN"));
    const client = freshClient();
    seedTimeline(client, []);
    const tab = mount(client, true);
    await typeAndSend(tab, "unwanted");
    await waitFor(() => expect(readOutbox(DRAFT_KEY)[0]?.failed).toBe(true));
    expect(timeline(client)).toHaveLength(1);

    act(() => {
      discardFailedSend(client, 7, DRAFT_KEY, readOutbox(DRAFT_KEY)[0].clientKey);
    });

    expect(readOutbox(DRAFT_KEY)).toEqual([]);
    expect(timeline(client)).toEqual([]);
  });

  it("a failed message shown again after reload is not resent until Retry", async () => {
    appendOutboxEntry(DRAFT_KEY, { content: "failed before reload", clientKey: "k-failed", failed: true });
    const client = freshClient();
    seedTimeline(client, []);
    mount(client, true);

    await waitFor(() => expect(timeline(client).map((m) => m.clientKey)).toEqual(["k-failed"]));
    expect(sendCalls()).toHaveLength(0);
  });
});

describe("the chat-level drain sends every channel's outbox", () => {
  it("delivers a queued message for a channel that is not open, and leaves failed ones alone", async () => {
    mockedPost.mockImplementation(async (url, body) => serverRow(readBody(body)));
    const otherChannel = chatDraftKey(9, UNSCOPED);
    appendOutboxEntry(otherChannel, { content: "queued elsewhere", clientKey: "k-queued" });
    appendOutboxEntry(otherChannel, { content: "failed elsewhere", clientKey: "k-failed", failed: true });

    renderHook(useChatOutboxDrain, { wrapper: wrapperFor(freshClient()) });

    await waitFor(() => expect(readOutbox(otherChannel).map((entry) => entry.clientKey)).toEqual(["k-failed"]));
    const posted = mockedPost.mock.calls.map(([url, body]) => [url, readBody(body).clientKey]);
    expect(posted).toEqual([["/chat/channels/9/messages", "k-queued"]]);
  });

  it("two drains mounted together send each queued message once", async () => {
    mockedPost.mockImplementation(async (url, body) => serverRow(readBody(body)));
    const otherChannel = chatDraftKey(9, UNSCOPED);
    appendOutboxEntry(otherChannel, { content: "one", clientKey: "k-one" });
    appendOutboxEntry(otherChannel, { content: "two", clientKey: "k-two" });
    const wrapper = wrapperFor(freshClient());

    renderHook(useChatOutboxDrain, { wrapper });
    renderHook(useChatOutboxDrain, { wrapper });

    await waitFor(() => expect(readOutbox(otherChannel)).toEqual([]));
    await act(async () => undefined);
    expect(mockedPost.mock.calls.map(([, body]) => readBody(body).clientKey)).toEqual(["k-one", "k-two"]);
  });

  it("negative control: an outbox under another storage scope is not drained", async () => {
    appendOutboxEntry(chatDraftKey(9, "org-b:user-1"), { content: "someone else", clientKey: "k-other" });

    renderHook(useChatOutboxDrain, { wrapper: wrapperFor(freshClient()) });

    await act(async () => undefined);
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
