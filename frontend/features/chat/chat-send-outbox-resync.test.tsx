import { act, renderHook, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useChatMessages } from "@/hooks/api/chat-core-read";
import { invalidateChatReconnect } from "@/hooks/api/chat-read-cache";
import { CHANNEL_ID, deferred, freshClient, installRandomUuid, seedTimeline, timeline, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import type { MessagesPage } from "@/types/chat";
import { readOutbox } from "./composer-draft";
import { DRAFT_KEY, delivered, isSendUrl, mockedPost, readBody, sendCalls, serverRow, typeAndSend, useComposerOverRealSend } from "./chat-send-outbox-test-harness";

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

const mockedGet = jest.mocked(apiClient.get);

function useTimelineAndComposer({ isOnline }: { isOnline: boolean }) {
  useChatMessages(CHANNEL_ID);
  return useComposerOverRealSend({ isOnline });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("a reconnect resync never removes a server-confirmed message", () => {
  it("offline queue of 2, reconnect, resync snapshot missing #2 resolves after #2's HTTP success: both bubbles stay", async () => {
    const secondSend = deferred<ReturnType<typeof serverRow>>();
    mockedPost.mockImplementation(async (url, body) => {
      if (!isSendUrl(String(url))) return undefined;
      const parsed = readBody(body);
      return parsed.content === "second" ? secondSend.promise : serverRow(parsed);
    });
    onlineManager.setOnline(false);
    const client = freshClient();
    seedTimeline(client, []);
    const tab = renderHook(useTimelineAndComposer, { wrapper: wrapperFor(client), initialProps: { isOnline: false } });

    await typeAndSend(tab, "first");
    await typeAndSend(tab, "second");
    expect(readOutbox(DRAFT_KEY).map((entry) => entry.content)).toEqual(["first", "second"]);

    await act(async () => {
      onlineManager.setOnline(true);
      tab.rerender({ isOnline: true });
    });
    await waitFor(() => expect(sendCalls().map((call) => call.content)).toEqual(["first", "second"]));
    await waitFor(() => expect(delivered(timeline(client)).map((m) => m.content)).toEqual(["first"]));
    const firstRow = delivered(timeline(client))[0];

    const snapshot = deferred<MessagesPage>();
    mockedGet.mockImplementation(() => snapshot.promise);
    let resync: Promise<void> = Promise.resolve();
    await act(async () => {
      resync = invalidateChatReconnect(client, CHANNEL_ID);
    });

    const [, secondCall] = sendCalls();
    await act(async () => secondSend.resolve(serverRow(secondCall)));
    await waitFor(() => expect(delivered(timeline(client)).map((m) => m.content)).toEqual(["first", "second"]));
    await waitFor(() => expect(readOutbox(DRAFT_KEY)).toEqual([]));

    await act(async () => {
      snapshot.resolve({ messages: [firstRow], nextCursor: null });
      await resync;
    });

    expect(timeline(client).map((m) => m.content)).toEqual(["first", "second"]);
    expect(delivered(timeline(client))).toHaveLength(2);
    expect(tab.result.current.messageInput).toBe("");
  });
});
