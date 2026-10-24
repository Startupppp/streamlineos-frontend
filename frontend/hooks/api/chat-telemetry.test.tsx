import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import {
  CHANNEL_ID,
  ablyMock,
  deferred,
  freshClient,
  message,
  seedTimeline,
  timeline,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";
import {
  abandonChatSend,
  beginChatSend,
  chatSendVisible,
  flushChatTelemetry,
  noteChatDuplicateDropped,
  recordChatReconnectGap,
  useChatTelemetryFlush,
} from "@/hooks/api/chat-telemetry";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: () => false,
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_scope: string, options: unknown) => useMutation(options) };
});

jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));

const mockedPost = jest.mocked(apiClient.post);
const { useAbly } = jest.requireMock<{ useAbly: jest.Mock }>("ably/react");

interface Sample {
  metric: string;
  value: number;
  realtime: boolean;
}

function telemetryBatches(): Sample[][] {
  return mockedPost.mock.calls
    .filter(([url]) => url === "/chat/telemetry")
    .map(([, body]) => {
      const samples: Sample[] = [];
      if (body && typeof body === "object" && "samples" in body && Array.isArray(body.samples))
        samples.push(...body.samples);
      return samples;
    });
}

function sent(metric: string): Sample[] {
  return telemetryBatches()
    .flat()
    .filter((sample) => sample.metric === metric);
}

beforeEach(() => {
  flushChatTelemetry();
  jest.clearAllMocks();
  mockedPost.mockResolvedValue(undefined);
});

describe("chat telemetry batching", () => {
  it("holds samples until the 20th, then posts them as one batch", () => {
    for (let index = 0; index < 19; index += 1) recordChatReconnectGap(index);
    expect(telemetryBatches()).toHaveLength(0);
    recordChatReconnectGap(19);
    expect(telemetryBatches()).toHaveLength(1);
    expect(telemetryBatches()[0]).toHaveLength(20);
    expect(telemetryBatches()[0]?.[3]).toEqual({ metric: "reconnect_gap", value: 3, realtime: true });
    expect(mockedPost.mock.calls[0]?.[3]).toBeDefined();
  });

  it("flushes every 30s and when the tab is hidden, once mounted", () => {
    jest.useFakeTimers();
    try {
      const { unmount } = renderHook(() => useChatTelemetryFlush());
      recordChatReconnectGap(2);
      jest.advanceTimersByTime(29_999);
      expect(telemetryBatches()).toHaveLength(0);
      jest.advanceTimersByTime(1);
      expect(telemetryBatches()).toEqual([[{ metric: "reconnect_gap", value: 2, realtime: true }]]);

      recordChatReconnectGap(4);
      const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      visibility.mockRestore();
      expect(telemetryBatches()).toHaveLength(2);
      unmount();
      recordChatReconnectGap(1);
      jest.advanceTimersByTime(60_000);
      expect(telemetryBatches()).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("posts nothing when there is nothing to send", () => {
    flushChatTelemetry();
    expect(telemetryBatches()).toHaveLength(0);
  });

  it("folds dedup drops into one duplicate_dropped sample, only when some were dropped", () => {
    noteChatDuplicateDropped(null);
    noteChatDuplicateDropped("ck-theirs");
    noteChatDuplicateDropped(undefined);
    flushChatTelemetry();
    flushChatTelemetry();
    expect(sent("duplicate_dropped")).toEqual([{ metric: "duplicate_dropped", value: 3, realtime: true }]);
  });

  it("never counts a drop carrying a clientKey this tab sent", () => {
    beginChatSend("ck-mine");
    chatSendVisible("ck-mine");
    noteChatDuplicateDropped("ck-mine");
    flushChatTelemetry();
    expect(sent("duplicate_dropped")).toHaveLength(0);
  });

  it("clamps values to the contract range", () => {
    recordChatReconnectGap(-5);
    recordChatReconnectGap(500_000);
    recordChatReconnectGap(2.6);
    flushChatTelemetry();
    expect(sent("reconnect_gap").map((sample) => sample.value)).toEqual([0, 120_000, 3]);
  });

  it("swallows a rejected post and a post that throws", async () => {
    mockedPost.mockRejectedValueOnce(new Error("offline"));
    recordChatReconnectGap(1);
    expect(() => flushChatTelemetry()).not.toThrow();
    await Promise.resolve();
    mockedPost.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    recordChatReconnectGap(1);
    expect(() => flushChatTelemetry()).not.toThrow();
  });

  it("records send_to_visible once however many confirmations arrive, and never for an abandoned send", () => {
    beginChatSend("ck-once");
    chatSendVisible("ck-once");
    chatSendVisible("ck-once");
    beginChatSend("ck-failed");
    abandonChatSend("ck-failed");
    chatSendVisible("ck-failed");
    chatSendVisible(null);
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
  });

  it("drops a send_to_visible sample over 120000 ms instead of clamping it", () => {
    const clock = jest.spyOn(performance, "now");
    clock.mockReturnValue(1_000);
    beginChatSend("ck-slow");
    clock.mockReturnValue(1_000 + 120_001);
    chatSendVisible("ck-slow");
    clock.mockReturnValue(5_000);
    beginChatSend("ck-edge");
    clock.mockReturnValue(5_000 + 120_000);
    chatSendVisible("ck-edge");
    clock.mockRestore();
    flushChatTelemetry();
    expect(sent("send_to_visible").map((sample) => sample.value)).toEqual([120_000]);
  });

  it("drops a send that started while offline and keeps one that started online", () => {
    const online = jest.spyOn(navigator, "onLine", "get");
    online.mockReturnValue(false);
    beginChatSend("ck-offline");
    online.mockReturnValue(true);
    beginChatSend("ck-online");
    chatSendVisible("ck-offline");
    chatSendVisible("ck-online");
    online.mockRestore();
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
  });

  it("bounds pending sends at 200, evicting the oldest", () => {
    for (let index = 0; index < 201; index += 1) beginChatSend(`ck-bound-${index}`);
    chatSendVisible("ck-bound-0");
    chatSendVisible("ck-bound-200");
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
  });
});

describe("send_to_visible through the real send and realtime paths", () => {
  const echo = (clientKey: string | null, id = 50, senderId = "user-1") => ({
    data: {
      id,
      channelId: CHANNEL_ID,
      senderId,
      senderName: "Ada",
      content: "hello",
      createdAt: "2026-10-21T10:00:00.000Z",
      replyToId: null,
      clientKey,
    },
  });
  const row = (clientKey: string) => ({
    ...message({ id: 50, senderId: "user-1", content: "hello" }),
    clientKey,
  });

  async function mountChat() {
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
    const { useChatRealtime } = await import("@/hooks/api/chat-realtime");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    seedTimeline(client, [message()]);
    const { result, unmount } = renderHook(
      () => ({ send: useSendMessage(), live: useChatRealtime(CHANNEL_ID) }),
      { wrapper: wrapperFor(client) },
    );
    await waitFor(() => expect(result.current.live.isConnected).toBe(true));
    const deliver = (clientKey: string | null, id?: number, senderId?: string) =>
      act(() => {
        ably.handlers.get("message")?.[0]?.(echo(clientKey, id, senderId));
      });
    return { client, result, unmount, deliver };
  }

  it("echo first: one sample, the later HTTP answer adds none", async () => {
    const { client, result, unmount, deliver } = await mountChat();
    const response = deferred<ReturnType<typeof row>>();
    mockedPost.mockImplementation((url) => (url === "/chat/telemetry" ? Promise.resolve(undefined) : response.promise));
    act(() => {
      result.current.send.mutate({ channelId: CHANNEL_ID, content: "hello", clientKey: "ck-echo" });
    });
    await waitFor(() => expect(timeline(client).some((m) => m.id < 0)).toBe(true));
    deliver("ck-echo");
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
    await act(async () => {
      response.resolve(row("ck-echo"));
      await response.promise;
    });
    await waitFor(() => expect(result.current.send.isSuccess).toBe(true));
    flushChatTelemetry();
    expect(sent("send_to_visible")).toEqual([expect.objectContaining({ realtime: true })]);
    expect(sent("duplicate_dropped")).toHaveLength(0);
    unmount();
  });

  it("HTTP first: one sample, and the late self-echo is not counted as a dedup drop", async () => {
    const { result, unmount, deliver } = await mountChat();
    mockedPost.mockImplementation((url) =>
      Promise.resolve(url === "/chat/telemetry" ? undefined : row("ck-http")),
    );
    await act(async () => {
      await result.current.send.mutateAsync({ channelId: CHANNEL_ID, content: "hello", clientKey: "ck-http" });
    });
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
    deliver("ck-http");
    flushChatTelemetry();
    expect(sent("send_to_visible")).toHaveLength(1);
    expect(sent("duplicate_dropped")).toHaveLength(0);
    unmount();
  });

  it("does not count the viewer's own message from another tab delivered twice", async () => {
    const { unmount, deliver } = await mountChat();
    deliver("ck-other-tab", 61, "user-1");
    deliver("ck-other-tab", 61, "user-1");
    flushChatTelemetry();
    expect(sent("duplicate_dropped")).toHaveLength(0);
    unmount();
  });

  it("counts another user's message delivered twice as one dedup drop", async () => {
    const { client, unmount, deliver } = await mountChat();
    deliver(null, 60, "user-2");
    deliver(null, 60, "user-2");
    expect(timeline(client).filter((m) => m.id === 60)).toHaveLength(1);
    flushChatTelemetry();
    expect(sent("duplicate_dropped")).toEqual([{ metric: "duplicate_dropped", value: 1, realtime: true }]);
    unmount();
  });
});
