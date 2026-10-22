import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { message } from "@/hooks/api/chat-cache-test-harness";
import type { ThreadPage } from "@/types/chat";
import { ThreadPanel } from "./thread-panel";

const mutateAsync = jest.fn();
const CHANNEL_ID = 1;
const PARENT_ID = 7;
const THREAD_KEY = collaborationQueryKeys.chat.thread(CHANNEL_ID, PARENT_ID);

jest.mock("@/hooks/api/chat-search", () => ({
  useThreadReplies: () => ({
    data: { pages: [{ parentMessage: null, replies: [], nextCursor: undefined }], pageParams: [] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useSendThreadReply: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({ useChatOrgUsers: () => ({ data: [] }) }));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada", image: null } },
    status: "authenticated",
  }),
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
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

let uuidCounter = 0;

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID === "function") return;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  uuidCounter = 0;
  Element.prototype.scrollTo = jest.fn();
});

afterEach(() => {
  localStorage.clear();
});

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function seedThreadData(client: QueryClient) {
  const data: InfiniteData<ThreadPage> = {
    pages: [{ parentMessage: message({ id: PARENT_ID, channelId: CHANNEL_ID }), replies: [], nextCursor: null }],
    pageParams: [undefined],
  };
  client.setQueryData(THREAD_KEY, data);
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function typeAndSendReply(text: string) {
  const user = userEvent.setup();
  const box = screen.getByRole("textbox", { name: "Reply in thread" });
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole("button", { name: "Send reply" }));
}

describe("ThreadPanel reply clientKey via outbox", () => {
  it("each new send mints a fresh clientKey because the outbox handles idempotency via localStorage persistence", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const client = freshClient();
    seedThreadData(client);
    render(
      <Wrapper client={client}>
        <ThreadPanel channelId={CHANNEL_ID} parentMessageId={PARENT_ID} currentUserId="user-1" onClose={() => undefined} />
      </Wrapper>,
    );

    await typeAndSendReply("first reply");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    await typeAndSendReply("second reply");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));

    const keys = mutateAsync.mock.calls.map(([input]) => input.clientKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("a queued reply is sent with its persisted clientKey after the thread data loads", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const client = freshClient();
    const draftKey = "unscoped::chat:thread:1:7";
    const clientKey = "00000000-0000-4000-8000-000000000001";
    localStorage.setItem(
      `${draftKey}:outbox`,
      JSON.stringify([{ content: "queued reply", clientKey }]),
    );

    render(
      <Wrapper client={client}>
        <ThreadPanel channelId={CHANNEL_ID} parentMessageId={PARENT_ID} currentUserId="user-1" onClose={() => undefined} />
      </Wrapper>,
    );

    await act(async () => {
      seedThreadData(client);
    });

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ clientKey, content: "queued reply" })));
  });

  it("a server-succeeded reply whose echo arrived before retry is discarded and not sent twice", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const client = freshClient();
    const draftKey = "unscoped::chat:thread:1:7";
    const clientKey = "00000000-0000-4000-8000-000000000001";
    localStorage.setItem(
      `${draftKey}:outbox`,
      JSON.stringify([{ content: "echo arrived", clientKey }]),
    );

    const threadDataWithDelivered: InfiniteData<ThreadPage> = {
      pages: [
        {
          parentMessage: message({ id: PARENT_ID, channelId: CHANNEL_ID }),
          replies: [
            {
              id: 501,
              channelId: CHANNEL_ID,
              senderId: "user-1",
              content: "echo arrived",
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

    render(
      <Wrapper client={client}>
        <ThreadPanel channelId={CHANNEL_ID} parentMessageId={PARENT_ID} currentUserId="user-1" onClose={() => undefined} />
      </Wrapper>,
    );

    await act(async () => {
      client.setQueryData(THREAD_KEY, threadDataWithDelivered);
    });

    await waitFor(() => expect(localStorage.getItem(`${draftKey}:outbox`)).toBeNull());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
