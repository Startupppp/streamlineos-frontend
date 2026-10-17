import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { Message, MessagesPage } from "@/types/chat";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

const CHANNEL_ID = 7;
const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);

function ablyMock() {
  const handlers = new Map<string, Array<(msg: unknown) => void>>();
  const channel = {
    subscribe: jest.fn((event: string, handler: (msg: unknown) => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return Promise.resolve(undefined);
    }),
    unsubscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
  };
  return {
    handlers,
    channels: { get: jest.fn().mockReturnValue(channel) },
    connection: { state: "connected", on: jest.fn(), off: jest.fn() },
  };
}

const source: Message = {
  id: 42,
  channelId: CHANNEL_ID,
  senderId: "user-2",
  content: "the login page 500s",
  replyToId: null,
  isEdited: false,
  isDeleted: false,
  messageType: "text",
  metadata: null,
  actionStatus: null,
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
  sender: { id: "user-2", name: "Bo", image: null },
  attachments: [],
  replyTo: null,
};

describe("message:updated carrying a converted ticket", () => {
  it("refetches the channel so the source message shows the ticket pill, without marking it edited", async () => {
    const { useChatRealtime } = await import("@/hooks/api/chat-realtime");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const seeded: InfiniteData<MessagesPage> = {
      pages: [{ messages: [source], nextCursor: null }],
      pageParams: [undefined],
    };
    client.setQueryData(messagesKey, seeded);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(ably.handlers.get("message:updated")?.length).toBe(1));

    act(() => {
      ably.handlers.get("message:updated")?.[0]?.({
        data: { id: 42, channelId: CHANNEL_ID, entities: [{ type: "ticket", id: "99" }] },
      });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: messagesKey });
    const after = client.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
    expect(after?.pages[0]?.messages[0]).toMatchObject({ content: "the login page 500s", isEdited: false });
    unmount();
  });
});
