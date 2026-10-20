import { useCallback, useState, type ReactNode, type UIEvent } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useChatMessages } from "@/hooks/api/chat-core-read";
import { useSendMessage } from "@/hooks/api/chat-core-mutations-a";
import type { Message, MessagesPage } from "@/types/chat";
import { mergeInboundMessage } from "./message-page-merge";
import { useMessageTimeline } from "./use-message-timeline";

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

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));

const CHANNEL_ID = 7;
const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);
const mockedGet = jest.mocked(apiClient.get);
const mockedPost = jest.mocked(apiClient.post);

function message(id: number, over: Partial<Message> = {}): Message {
  return {
    id,
    channelId: CHANNEL_ID,
    senderId: "user-2",
    sender: { id: "user-2", name: "Bo", image: null },
    content: `message ${id}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    attachments: [],
    replyTo: null,
    ...over,
  };
}

function positioned(id: number) {
  return { ...message(id), channelPosition: id };
}

let contextResult: () => Promise<unknown>;

function routeGet(path: string, params?: unknown): Promise<unknown> {
  if (path.endsWith("/context")) return contextResult();
  if (path.endsWith("/messages/poll"))
    return Promise.resolve({ messages: [message(43)], nextCursor: null, hasMore: false, latestPosition: 43 });
  if (path.endsWith("/messages")) {
    if (params && typeof params === "object" && "cursor" in params)
      return Promise.resolve({ messages: [message(38), message(39)], nextCursor: null });
    return Promise.resolve({ messages: [message(100), message(101), message(102)], nextCursor: 99 });
  }
  return Promise.reject(new Error(`unexpected GET ${path}`));
}

function getCalls(suffix: string) {
  return mockedGet.mock.calls.filter(([path]) => String(path).endsWith(suffix));
}

const leaveSpy = jest.fn();

function useHarness(initialAnchor: number | null) {
  const [anchor, setAnchor] = useState<number | null>(initialAnchor);
  const handleLeave = useCallback(() => {
    leaveSpy();
    setAnchor(null);
  }, []);
  const history = useChatMessages(CHANNEL_ID);
  const send = useSendMessage();
  const timeline = useMessageTimeline({
    channelId: CHANNEL_ID,
    currentUserId: "user-1",
    members: undefined,
    anchorMessageId: anchor,
    onLeaveAnchor: handleLeave,
    history,
    send,
  });
  return { anchor, timeline };
}

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function ids(result: { current: ReturnType<typeof useHarness> }) {
  return result.current.timeline.messages.map((m) => m.id);
}

function mainIds() {
  return (
    client
      .getQueryData<InfiniteData<MessagesPage>>(messagesKey)
      ?.pages.flatMap((page) => page.messages.map((m) => m.id)) ?? []
  );
}

async function landOnOldMessage() {
  const hook = renderHook(() => useHarness(41), { wrapper: Wrapper });
  await waitFor(() => expect(ids(hook.result)).toEqual([40, 41, 42]));
  return hook;
}

function scrolledToEnd(): UIEvent<HTMLDivElement> {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", { value: 1000 });
  Object.defineProperty(el, "clientHeight", { value: 400 });
  el.scrollTop = 600;
  return { currentTarget: el } as unknown as UIEvent<HTMLDivElement>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } } });
  contextResult = () =>
    Promise.resolve({
      messages: [positioned(40), positioned(41), positioned(42)],
      targetMessageId: 41,
      olderCursor: 40,
      hasNewer: true,
    });
  mockedGet.mockImplementation(routeGet);
  mockedPost.mockReturnValue(new Promise(() => undefined));
});

describe("useMessageTimeline — an old ?message renders its own context window, the main cache stays untouched", () => {
  it("lands on the context window while messages(channelId) still holds the newest page", async () => {
    const { result } = await landOnOldMessage();
    expect(result.current.timeline.list.latestLabel).toBe("Jump to latest");
    expect(result.current.timeline.list.showScrollBtn).toBe(true);
    expect(mainIds()).toEqual([100, 101, 102]);
    expect(getCalls("/messages/41/context")).toHaveLength(1);
  });

  it("does not ask for a context window when the cached newest page already holds the target", async () => {
    client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, {
      pages: [{ messages: [message(100), message(101), message(102)], nextCursor: 99 }],
      pageParams: [undefined],
    });
    const { result } = renderHook(() => useHarness(101), { wrapper: Wrapper });
    await waitFor(() => expect(ids(result)).toEqual([100, 101, 102]));
    expect(getCalls("/context")).toHaveLength(0);
    expect(result.current.timeline.list.latestLabel).toBe("New messages");
  });

  it("starts the context read in parallel with the first page, not after it", async () => {
    let releaseMain: (page: unknown) => void = () => undefined;
    mockedGet.mockImplementation((path: string, params?: unknown) => {
      if (path.endsWith("/messages") && !(params && typeof params === "object" && "cursor" in params))
        return new Promise((resolve) => {
          releaseMain = resolve;
        });
      return routeGet(path, params);
    });
    const { result } = renderHook(() => useHarness(41), { wrapper: Wrapper });
    await waitFor(() => expect(getCalls("/messages/41/context")).toHaveLength(1));
    expect(result.current.timeline.list.isLoading).toBe(true);
    await act(async () => {
      releaseMain({ messages: [message(100), message(101), message(102)], nextCursor: 99 });
    });
    await waitFor(() => expect(ids(result)).toEqual([40, 41, 42]));
  });

  it("renders the main page, not the context window, when the first page turns out to hold the target", async () => {
    const { result } = renderHook(() => useHarness(101), { wrapper: Wrapper });
    await waitFor(() => expect(ids(result)).toEqual([100, 101, 102]));
    expect(result.current.timeline.list.latestLabel).toBe("New messages");
  });

  it("hides tombstones in the context window, except the anchored message itself", async () => {
    contextResult = () =>
      Promise.resolve({
        messages: [
          { ...positioned(40), isDeleted: true, content: null },
          { ...positioned(41), isDeleted: true, content: null },
          positioned(42),
        ],
        targetMessageId: 41,
        olderCursor: null,
        hasNewer: false,
      });
    const { result } = renderHook(() => useHarness(41), { wrapper: Wrapper });
    await waitFor(() => expect(ids(result)).toEqual([41, 42]));
  });

  it("leaving is idempotent per anchor: two jumps write the URL once", async () => {
    const { result } = await landOnOldMessage();
    const jump = result.current.timeline.list.scrollToBottom;
    act(() => {
      jump();
      jump();
    });
    expect(leaveSpy).toHaveBeenCalledTimes(1);
  });

  it("an auto-opened anchor thread stays open after leaving context mode", async () => {
    contextResult = () =>
      Promise.resolve({
        messages: [positioned(40), { ...positioned(41), replyToId: 40 }, positioned(42)],
        targetMessageId: 41,
        olderCursor: null,
        hasNewer: true,
      });
    const { result } = renderHook(() => useHarness(41), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.timeline.threadMessageId).toBe(40));
    act(() => result.current.timeline.list.scrollToBottom());
    expect(result.current.anchor).toBeNull();
    expect(result.current.timeline.threadMessageId).toBe(40);
    act(() => result.current.timeline.closeThread());
    expect(result.current.timeline.threadMessageId).toBeNull();
  });

  it("a refetch of the main history does not move the reader off the context window", async () => {
    const { result } = await landOnOldMessage();
    await act(async () => {
      await client.refetchQueries({ queryKey: messagesKey });
    });
    expect(ids(result)).toEqual([40, 41, 42]);
    expect(getCalls("/context")).toHaveLength(1);
  });

  it("Jump to latest leaves ?message and shows the newest messages from the untouched cache, with no new read", async () => {
    const { result } = await landOnOldMessage();
    const pageReads = getCalls("/messages").length;
    act(() => result.current.timeline.list.scrollToBottom());
    expect(result.current.anchor).toBeNull();
    expect(ids(result)).toEqual([100, 101, 102]);
    expect(getCalls("/messages")).toHaveLength(pageReads);
  });

  it("sending a message leaves context mode, so the sent message is visible with the newest ones", async () => {
    const { result } = await landOnOldMessage();
    act(() => {
      void result.current.timeline.sendMessage.mutateAsync({ channelId: CHANNEL_ID, content: "hello from the past" });
    });
    expect(result.current.anchor).toBeNull();
    await waitFor(() =>
      expect(result.current.timeline.messages.at(-1)?.content).toBe("hello from the past"),
    );
    expect(ids(result).slice(0, 3)).toEqual([100, 101, 102]);
  });

  it("a realtime arrival lands in the main cache only, never inside the old window", async () => {
    const { result } = await landOnOldMessage();
    act(() => {
      client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) =>
        old ? mergeInboundMessage(old, message(103), null) : old,
      );
    });
    expect(ids(result)).toEqual([40, 41, 42]);
    expect(mainIds()).toEqual([100, 101, 102, 103]);
    act(() => result.current.timeline.list.scrollToBottom());
    expect(ids(result)).toEqual([100, 101, 102, 103]);
  });

  it("pages forward through the poll route from the window's newest position, then leaves at the end", async () => {
    const { result } = await landOnOldMessage();
    await act(async () => {
      result.current.timeline.list.onScroll(scrolledToEnd());
    });
    await waitFor(() => expect(ids(result)).toEqual([40, 41, 42, 43]));
    expect(getCalls("/messages/poll")[0]?.[1]).toEqual({ cursor: 42 });
    act(() => result.current.timeline.list.onScroll(scrolledToEnd()));
    expect(result.current.anchor).toBeNull();
  });

  it("pages older history through the window's older cursor", async () => {
    const { result } = await landOnOldMessage();
    expect(result.current.timeline.list.hasNextPage).toBe(true);
    await act(async () => {
      result.current.timeline.list.fetchNextPage();
    });
    await waitFor(() => expect(ids(result)).toEqual([38, 39, 40, 41, 42]));
    expect(mockedGet).toHaveBeenCalledWith(`/chat/channels/${CHANNEL_ID}/messages`, { cursor: 40 }, expect.anything(), expect.anything());
  });
});

describe("useMessageTimeline — only a gone or forbidden message drops ?message", () => {
  it("a 404 says the message is no longer available and leaves", async () => {
    contextResult = () => Promise.reject(new ApiError("Not found", 404));
    const { result } = renderHook(() => useHarness(41), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.anchor).toBeNull());
    expect(toast.error).toHaveBeenCalledWith("That message is no longer available", expect.anything());
    expect(ids(result)).toEqual([100, 101, 102]);
  });

  it("a transient failure keeps ?message and offers a retry that reads the window again", async () => {
    contextResult = () => Promise.reject(new ApiError("Server error", 500));
    const { result } = renderHook(() => useHarness(41), { wrapper: Wrapper });
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(result.current.anchor).toBe(41);
    const options = jest.mocked(toast.error).mock.calls[0]?.[1];
    const action = options && "action" in options ? options.action : undefined;
    expect(action && typeof action === "object" && "label" in action ? action.label : null).toBe("Try again");

    contextResult = () =>
      Promise.resolve({ messages: [positioned(41)], targetMessageId: 41, olderCursor: null, hasNewer: false });
    await act(async () => {
      if (action && typeof action === "object" && "onClick" in action && typeof action.onClick === "function")
        action.onClick(new MouseEvent("click") as unknown as React.MouseEvent<HTMLButtonElement>);
    });
    await waitFor(() => expect(ids(result)).toEqual([41]));
  });
});
