import { act, renderHook, waitFor } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import type { MessagesPage } from "@/types/chat";
import { mergeInboundMessage } from "@/features/chat/message-page-merge";
import {
  CHANNEL_ID,
  ablyMock,
  freshClient,
  message,
  messagesKey,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

const parent = message({ id: 1, content: "the parent", sender: { id: "user-2", name: "Bo", image: null } });

function page(messages: MessagesPage["messages"]): InfiniteData<MessagesPage> {
  return { pages: [{ messages, nextCursor: null }], pageParams: [undefined] };
}

describe("a live reply keeps its quote", () => {
  it("builds replyTo from the cached parent, because the realtime frame only carries replyToId", async () => {
    const { useChatRealtime } = await import("@/hooks/api/chat-realtime");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    client.setQueryData(messagesKey, page([parent]));
    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(ably.handlers.get("message")?.length).toBe(1));
    act(() => {
      ably.handlers.get("message")?.[0]?.({
        data: {
          id: 2,
          channelId: CHANNEL_ID,
          senderId: "user-3",
          senderName: "Cy",
          content: "a reply",
          createdAt: "2026-10-20T10:00:00.000Z",
          replyToId: 1,
        },
      });
    });
    const reply = client.getQueryData<InfiniteData<MessagesPage>>(messagesKey)?.pages[0]?.messages.find((m) => m.id === 2);
    expect(reply?.replyTo).toEqual({ id: 1, content: "the parent", sender: parent.sender });
    unmount();
  });

  it("keeps the optimistic quote when the echo replaces the sender's copy without one", () => {
    const quote = { id: 1, content: "the parent", sender: parent.sender, isDeleted: false };
    const optimistic = message({ id: -5, clientKey: "k-1", replyToId: 1, replyTo: quote });
    const echo = message({ id: 9, clientKey: "k-1", replyToId: 1, replyTo: null });
    const merged = mergeInboundMessage(page([optimistic]), echo, "k-1");
    expect(merged.pages[0]?.messages).toEqual([{ ...echo, replyTo: quote }]);
  });
});
