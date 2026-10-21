import { renderHook, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { freshClient, installRandomUuid, seedTimeline, timeline, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import { readOutbox } from "./composer-draft";
import { DRAFT_KEY, delivered, isSendUrl, mockedPost, mount, readBody, sendCalls, serverRow, typeAndSend, useComposerOverRealSend } from "./chat-send-outbox-test-harness";

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

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("a rate-limited burst loses nothing", () => {
  it("56 fast sends against a 30-per-window limit: every message is delivered exactly once, in order", async () => {
    const accepted: SendBody[] = [];
    let windowCount = 0;
    let rejected = 0;
    mockedPost.mockImplementation(async (url, body) => {
      if (!isSendUrl(String(url))) return undefined;
      if (windowCount >= 30) {
        windowCount = 0;
        rejected += 1;
        throw new ApiError("Too many requests", 429, "RATE_LIMITED", { retryAfterSecs: 1 });
      }
      windowCount += 1;
      const parsed = readBody(body);
      accepted.push(parsed);
      return serverRow(parsed);
    });
    const client = freshClient();
    seedTimeline(client, []);
    const tab = mount(client, true);
    const expected = Array.from({ length: 56 }, (_, index) => `burst-${index + 1}`);

    for (const text of expected) await typeAndSend(tab, text);
    expect(tab.result.current.messageInput).toBe("");
    expect(timeline(client)).toHaveLength(56);

    await waitFor(() => expect(accepted).toHaveLength(56), { timeout: 8_000 });
    expect(rejected).toBeGreaterThan(0);
    expect(accepted.map((call) => call.content)).toEqual(expected);
    expect(new Set(accepted.map((call) => call.clientKey)).size).toBe(56);
    await waitFor(() => expect(delivered(timeline(client)).map((m) => m.content)).toEqual(expected));
    expect(readOutbox(DRAFT_KEY)).toEqual([]);
    expect(toast.error).not.toHaveBeenCalled();
  }, 15_000);

  it("a 503 keeps the message pending and retries it with the same key", async () => {
    let calls = 0;
    mockedPost.mockImplementation(async (url, body) => {
      if (!isSendUrl(String(url))) return undefined;
      calls += 1;
      if (calls === 1) throw new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE", { retryAfterSecs: 1 });
      return serverRow(readBody(body));
    });
    const client = freshClient();
    seedTimeline(client, []);
    const tab = mount(client, true);
    await typeAndSend(tab, "through the outage");

    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    expect(timeline(client)[0].id).toBeLessThan(0);
    expect(readOutbox(DRAFT_KEY)).toHaveLength(1);

    await waitFor(() => expect(delivered(timeline(client))).toHaveLength(1), { timeout: 4_000 });
    const [firstKey, secondKey] = sendCalls().map((call) => call.clientKey);
    expect(secondKey).toBe(firstKey);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("ordering is per channel", () => {
  it("a channel stuck on 503 does not hold up another channel, and still delivers in order once it recovers", async () => {
    const OTHER_ID = 8;
    let channelDown = true;
    const accepted: Array<{ channel: string; content?: string }> = [];
    mockedPost.mockImplementation(async (url, body) => {
      const parsed = readBody(body);
      if (isSendUrl(String(url))) {
        if (channelDown) throw new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE", { retryAfterSecs: 1 });
        accepted.push({ channel: "A", content: parsed.content });
        return serverRow(parsed);
      }
      if (isSendUrl(String(url), OTHER_ID)) {
        accepted.push({ channel: "B", content: parsed.content });
        return { ...serverRow(parsed), channelId: OTHER_ID };
      }
      return undefined;
    });
    const client = freshClient();
    seedTimeline(client, []);
    client.setQueryData(collaborationQueryKeys.chat.messages(OTHER_ID), { pages: [{ messages: [], nextCursor: null }], pageParams: [undefined] });
    const wrapper = wrapperFor(client);
    const channelA = renderHook(useComposerOverRealSend, { wrapper, initialProps: { isOnline: true } });
    const channelB = renderHook(useComposerOverRealSend, {
      wrapper,
      initialProps: { isOnline: true, channelId: OTHER_ID, draftKey: "chat:draft:8" },
    });

    await typeAndSend(channelA, "a-1");
    await typeAndSend(channelA, "a-2");
    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    await typeAndSend(channelB, "b-1");

    await waitFor(() => expect(accepted).toEqual([{ channel: "B", content: "b-1" }]), { timeout: 500 });
    expect(timeline(client).map((m) => m.id < 0)).toEqual([true, true]);

    channelDown = false;
    await waitFor(() => expect(accepted).toHaveLength(3), { timeout: 4_000 });
    expect(accepted.filter((entry) => entry.channel === "A").map((entry) => entry.content)).toEqual(["a-1", "a-2"]);
    await waitFor(() => expect(delivered(timeline(client)).map((m) => m.content)).toEqual(["a-1", "a-2"]));
    expect(sendCalls().filter((call) => call.content === "a-2")).toHaveLength(1);
  });
});
