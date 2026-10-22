import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { installRandomUuid, message } from "@/hooks/api/chat-cache-test-harness";
import type { Message, ThreadPage } from "@/types/chat";
import { readOutbox } from "./composer-draft";
import { useThreadOutbox } from "./use-chat-offline-queue";
import { ThreadMessage } from "./thread-message";

const CHANNEL_ID = 7;
const PARENT_ID = 42;
const THREAD_DRAFT_KEY = "unscoped::chat:thread:7:42";
const THREAD_KEY = collaborationQueryKeys.chat.thread(CHANNEL_ID, PARENT_ID);

const mockedPost = jest.mocked(apiClient.post);

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
  toast: Object.assign(jest.fn(), { error: jest.fn(), info: jest.fn(), success: jest.fn(), warning: jest.fn() }),
}));

installRandomUuid();

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function emptyThreadData(): InfiniteData<ThreadPage> {
  return {
    pages: [{ parentMessage: message({ id: PARENT_ID }), replies: [], nextCursor: null }],
    pageParams: [undefined],
  };
}

function seedThread(client: QueryClient) {
  client.setQueryData(THREAD_KEY, emptyThreadData());
}

function threadReplies(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<ThreadPage>>(THREAD_KEY)?.pages.flatMap((p) => p.replies) ?? [];
}

function delivered(replies: Message[]): Message[] {
  return replies.filter((r) => r.id > 0);
}

function isThreadSendUrl(url: unknown): boolean {
  return String(url) === `/chat/channels/${CHANNEL_ID}/messages/${PARENT_ID}/thread`;
}

let nextId = 900;
function serverRow(content: string, clientKey: string) {
  nextId += 1;
  return {
    id: nextId,
    orgId: "org-1",
    channelId: CHANNEL_ID,
    senderMembershipId: 11,
    content,
    replyToId: PARENT_ID,
    isEdited: false,
    isDeleted: false,
    messageType: "text" as const,
    metadata: null,
    actionStatus: null,
    clientKey,
    channelPosition: nextId,
    createdAt: "2026-10-22T10:00:00.000Z",
    updatedAt: "2026-10-22T10:00:00.000Z",
  };
}

function goOffline() {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
  window.dispatchEvent(new Event("offline"));
}

function goOnline() {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  window.dispatchEvent(new Event("online"));
}

function mount(client: QueryClient) {
  return renderHook(() => useThreadOutbox({ channelId: CHANNEL_ID, parentMessageId: PARENT_ID }), {
    wrapper: wrapperFor(client),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  nextId = 900;
  goOnline();
});

afterEach(() => {
  goOnline();
  localStorage.clear();
});

describe("thread reply offline queue: exactly-once delivery", () => {
  it("queues a reply sent offline, delivers it exactly once on reconnect and clears the outbox", async () => {
    mockedPost.mockImplementation(async (url, body) => {
      if (!isThreadSendUrl(url)) return undefined;
      const b = body as Record<string, unknown>;
      return serverRow(String(b.content ?? ""), String(b.clientKey ?? ""));
    });

    await act(async () => { goOffline(); });
    const client = freshClient();
    seedThread(client);
    const tab = mount(client);

    const clientKey = crypto.randomUUID();
    await act(async () => {
      await tab.result.current.enqueue({ content: "offline reply", clientKey });
    });

    expect(readOutbox(THREAD_DRAFT_KEY)).toHaveLength(1);
    expect(delivered(threadReplies(client))).toHaveLength(0);
    expect(mockedPost).not.toHaveBeenCalledWith(
      expect.stringContaining("/thread"),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    await act(async () => { goOnline(); });

    await waitFor(() => expect(delivered(threadReplies(client))).toHaveLength(1));
    expect(readOutbox(THREAD_DRAFT_KEY)).toHaveLength(0);
    const threadCalls = mockedPost.mock.calls.filter(([url]) => isThreadSendUrl(url));
    expect(threadCalls).toHaveLength(1);
    expect((threadCalls[0][1] as Record<string, unknown>).clientKey).toBe(clientKey);
  });

  it("does not re-send a reply whose server echo arrived before the retry fires", async () => {
    const clientKey = crypto.randomUUID();
    const draftOutboxKey = `${THREAD_DRAFT_KEY}:outbox`;
    localStorage.setItem(draftOutboxKey, JSON.stringify([{ content: "already landed", clientKey }]));

    const withDelivered: InfiniteData<ThreadPage> = {
      pages: [
        {
          parentMessage: message({ id: PARENT_ID }),
          replies: [
            {
              id: 901,
              channelId: CHANNEL_ID,
              senderId: "user-1",
              content: "already landed",
              clientKey,
              replyToId: PARENT_ID,
              isEdited: false,
              isDeleted: false,
              messageType: "text",
              metadata: null,
              actionStatus: null,
              reactions: {},
              createdAt: "2026-10-22T10:00:00.000Z",
              updatedAt: "2026-10-22T10:00:00.000Z",
              sender: { id: "user-1", name: "Ada", image: null },
              attachments: [],
              replyTo: null,
            },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    };

    const client = freshClient();
    client.setQueryData(THREAD_KEY, withDelivered);
    mount(client);

    await waitFor(() => expect(localStorage.getItem(draftOutboxKey)).toBeNull());
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("a reply that fails is retried with the same clientKey so the server cannot duplicate it", async () => {
    let calls = 0;
    const clientKey = crypto.randomUUID();
    mockedPost.mockImplementation(async (url, body) => {
      if (!isThreadSendUrl(url)) return undefined;
      calls += 1;
      if (calls === 1) throw new Error("network error");
      const b = body as Record<string, unknown>;
      return serverRow(String(b.content ?? ""), String(b.clientKey ?? ""));
    });

    const client = freshClient();
    seedThread(client);
    const tab = mount(client);

    await act(async () => {
      await tab.result.current.enqueue({ content: "retry me", clientKey });
    });

    await waitFor(() =>
      expect(readOutbox(THREAD_DRAFT_KEY).find((e) => e.clientKey === clientKey)?.failed).toBe(true),
    );

    const { retryFailedSend } = await import("./chat-outbox-delivery");
    await act(async () => {
      retryFailedSend(THREAD_DRAFT_KEY, clientKey);
    });

    await waitFor(() => expect(delivered(threadReplies(client))).toHaveLength(1));
    const sentClientKeys = mockedPost.mock.calls
      .filter(([url]) => isThreadSendUrl(url))
      .map(([, body]) => (body as Record<string, unknown>).clientKey);
    expect(sentClientKeys[0]).toBe(clientKey);
    expect(sentClientKeys[1]).toBe(clientKey);
    expect(readOutbox(THREAD_DRAFT_KEY)).toHaveLength(0);
  });

  it("a failed reply shows Not sent in the thread and Discard removes it from the outbox and the thread", async () => {
    mockedPost.mockImplementation(async (url) => {
      if (isThreadSendUrl(url)) throw new Error("network error");
      return undefined;
    });
    const clientKey = crypto.randomUUID();
    const client = freshClient();
    seedThread(client);
    const tab = mount(client);

    await act(async () => {
      await tab.result.current.enqueue({ content: "will fail", clientKey });
    });
    await waitFor(() =>
      expect(readOutbox(THREAD_DRAFT_KEY).find((e) => e.clientKey === clientKey)?.failed).toBe(true),
    );
    const pendingReply = threadReplies(client).find((r) => r.clientKey === clientKey);
    expect(pendingReply).toBeDefined();
    if (!pendingReply) return;

    render(
      <QueryClientProvider client={client}>
        <ThreadMessage
          message={pendingReply}
          currentUserId="user-1"
          resolveUserName={() => "Ada"}
          outbox={tab.result.current}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Not sent");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    });
    expect(readOutbox(THREAD_DRAFT_KEY)).toHaveLength(0);
    expect(threadReplies(client).some((r) => r.clientKey === clientKey)).toBe(false);
  });
});
