import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Channel, ChannelMember, ChatNotificationPreference } from "@/types/chat";
import { chatChannelName } from "@/lib/ably-channels";
import { useChatGlobalNotifications } from "@/hooks/api/chat-notifications";
import { useChatRealtime } from "@/hooks/api/chat-realtime";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("ably/react", () => ({ useAbly: jest.fn() }));

jest.mock("@/lib/ably", () => ({
  reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("sonner", () => ({ toast: jest.fn() }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const { toast } = jest.requireMock("sonner") as { toast: jest.Mock };

type Handler = (msg: { data: unknown; clientId?: string }) => void;

function makeAblyMock() {
  const handlers = new Map<string, Handler[]>();

  function makeChannel(name: string) {
    return {
      subscribe: jest.fn().mockImplementation((event: string, handler: Handler) => {
        const key = `${name}::${event}`;
        handlers.set(key, [...(handlers.get(key) ?? []), handler]);
        return Promise.resolve(undefined);
      }),
      unsubscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    };
  }

  const channels = new Map<string, ReturnType<typeof makeChannel>>();

  return {
    handlers,
    channels: {
      get: jest.fn().mockImplementation((name: string) => {
        const existing = channels.get(name);
        if (existing !== undefined) return existing;
        const created = makeChannel(name);
        channels.set(name, created);
        return created;
      }),
    },
    connection: { state: "connected", on: jest.fn(), off: jest.fn() },
  };
}

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

const CHANNEL_ID = 7;
const CURRENT_USER_ID = "user-1";
const CHAT_CHANNEL = chatChannelName("org-1", CHANNEL_ID);

const notificationSpy = jest.fn();

class NotificationStub {
  static permission = "granted";
  constructor(title: string, options?: { body?: string }) {
    notificationSpy(title, options);
  }
}

function member(overrides: Partial<ChannelMember>): ChannelMember {
  return {
    id: 1,
    channelId: CHANNEL_ID,
    userId: CURRENT_USER_ID,
    role: "MEMBER",
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    user: { id: CURRENT_USER_ID, name: "Ada", image: null },
    ...overrides,
  };
}

function channelWith(options: {
  mutedUntil?: Date | string | null;
  notificationPreference?: ChatNotificationPreference;
}): Channel {
  return {
    id: CHANNEL_ID,
    name: "general",
    type: "GROUP",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [
      member({
        mutedUntil: options.mutedUntil ?? null,
        notificationPreference: options.notificationPreference ?? "DEFAULT",
      }),
    ],
    unreadCount: 0,
    lastMessage: null,
  };
}

const INBOUND_MESSAGE = {
  id: 4242,
  channelId: CHANNEL_ID,
  senderId: "user-2",
  senderName: "Bob",
  senderImage: null,
  content: "standup in five",
  createdAt: new Date().toISOString(),
  replyToId: null,
  metadata: null,
};

const FAR_FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function freshClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

async function deliverToGlobalNotifications(channel: Channel): Promise<() => void> {
  const ably = makeAblyMock();
  useAbly.mockReturnValue(ably);

  const { unmount } = renderHook(
    () => useChatGlobalNotifications([channel], null, CURRENT_USER_ID),
    { wrapper: makeWrapper(freshClient()) },
  );

  await waitFor(() => {
    expect(ably.handlers.get(`${CHAT_CHANNEL}::message`)?.length).toBe(1);
  });

  const handler = ably.handlers.get(`${CHAT_CHANNEL}::message`)?.[0];
  if (handler === undefined) throw new Error("no per-channel message handler subscribed");

  act(() => {
    handler({ data: INBOUND_MESSAGE });
  });

  return unmount;
}

beforeAll(() => {
  Object.defineProperty(globalThis, "Notification", {
    writable: true,
    configurable: true,
    value: NotificationStub,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  notificationSpy.mockClear();
  NotificationStub.permission = "granted";
});

describe("a muted channel raises no alert", () => {
  it("shows no toast for a message in a channel the viewer muted", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ mutedUntil: FAR_FUTURE }),
    );

    expect(toast).not.toHaveBeenCalled();

    unmount();
  });

  it("raises no OS notification for a message in a channel the viewer muted", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ mutedUntil: FAR_FUTURE }),
    );

    expect(notificationSpy).not.toHaveBeenCalled();

    unmount();
  });

  it("positive control — an unmuted channel still toasts, so the mute assertions are not vacuous", async () => {
    const unmount = await deliverToGlobalNotifications(channelWith({}));

    expect(toast).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("positive control — an unmuted channel still raises an OS notification", async () => {
    const unmount = await deliverToGlobalNotifications(channelWith({}));

    expect(notificationSpy).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("an expired mute alerts again, so mutedUntil is read as a deadline and not a flag", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ mutedUntil: new Date(Date.now() - 60_000).toISOString() }),
    );

    expect(toast).toHaveBeenCalledTimes(1);

    unmount();
  });
});

describe("the notification preference suppresses general alerts", () => {
  it("shows no toast when the viewer chose NOTHING", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ notificationPreference: "NOTHING" }),
    );

    expect(toast).not.toHaveBeenCalled();

    unmount();
  });

  it("shows no toast for an ordinary message when the viewer chose MENTIONS", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ notificationPreference: "MENTIONS" }),
    );

    expect(toast).not.toHaveBeenCalled();

    unmount();
  });

  it("positive control — ALL still toasts", async () => {
    const unmount = await deliverToGlobalNotifications(
      channelWith({ notificationPreference: "ALL" }),
    );

    expect(toast).toHaveBeenCalledTimes(1);

    unmount();
  });
});

describe("useChatRealtime does not own the alert decision", () => {
  it("raises no OS notification of its own, because the unfiltered per-channel frame cannot see mute state", async () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => {
      expect(ably.handlers.get(`${CHAT_CHANNEL}::message`)?.length).toBe(1);
    });

    const handler = ably.handlers.get(`${CHAT_CHANNEL}::message`)?.[0];
    if (handler === undefined) throw new Error("no message handler subscribed");

    act(() => {
      handler({ data: INBOUND_MESSAGE });
    });

    expect(notificationSpy).not.toHaveBeenCalled();

    unmount();
  });
});
