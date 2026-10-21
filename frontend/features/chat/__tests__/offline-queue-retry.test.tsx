import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-envelope";
import { useMessageComposer } from "../use-message-composer";
import { readOutbox } from "../composer-draft";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "me", name: "Me", image: null } }, status: "authenticated" }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  ...jest.requireActual("@/hooks/api/access"),
  useCan: () => true,
}));

function QueryWrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const { toast } = jest.requireMock("sonner") as {
  toast: { error: jest.Mock; info: jest.Mock; success: jest.Mock };
};

const CHANNEL_ID = 7;

const DRAFT_KEY = `chat:draft:${CHANNEL_ID}`;

type ComposerResult = ReturnType<typeof useMessageComposer>;

function mountComposer(options: {
  isOnline: boolean;
  send: jest.Mock;
}): { current: ComposerResult; reconnect: () => void } {
  const { result, rerender } = renderHook(({ isOnline }: { isOnline: boolean }) =>
    useMessageComposer({
      channelId: CHANNEL_ID,
      draftKey: DRAFT_KEY,
      isOnline,
      sendMessage: { mutateAsync: options.send },
      editMessage: { mutateAsync: jest.fn() },
      markRead: { mutate: jest.fn() },
      scrollToBottom: jest.fn(),
      publishTyping: jest.fn(),
      channel: undefined,
      currentUserId: "me",
    }),
    { wrapper: QueryWrapper, initialProps: { isOnline: options.isOnline } },
  );
  return {
    get current() {
      return result.current;
    },
    reconnect: () => act(() => rerender({ isOnline: true })),
  };
}

function stillOffline(): ApiError {
  return new ApiError("Network error", undefined, "NETWORK_ERROR");
}

async function queueOneOfflineMessage(
  result: { current: ComposerResult },
  content: string,
): Promise<void> {
  act(() => {
    result.current.setMessageInput(content);
  });
  await act(async () => {
    await result.current.handleSend();
  });
}

let nextUuid = 0;

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID !== "function")
    Object.defineProperty(globalThis, "crypto", {
      writable: true,
      configurable: true,
      value: {
        ...globalThis.crypto,
        randomUUID: () => `00000000-0000-4000-8000-${String(++nextUuid).padStart(12, "0")}`,
      },
    });
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("the composer owns its offline queue", () => {
  it("publishes flushMessageQueue, so the panel cannot implement a second drain", () => {
    const result = mountComposer({ isOnline: true, send: jest.fn() });

    expect(typeof result.current.flushMessageQueue).toBe("function");
  });

  it("queues a message written offline instead of sending it", async () => {
    const send = jest.fn();
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");

    expect(send).not.toHaveBeenCalled();
    expect(readOutbox(DRAFT_KEY).map((entry) => entry.content)).toEqual(["written on a train"]);
    expect(result.current.messageInput).toBe("");
  });

  it("makes no network attempt on an explicit drain while still offline", async () => {
    const send = jest.fn();
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).not.toHaveBeenCalled();
    expect(readOutbox(DRAFT_KEY)).toHaveLength(1);
  });
});

describe("draining the offline queue on reconnect", () => {
  it("keeps a message that fails to send, so a failed reconnect cannot discard what the user wrote", async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(stillOffline());
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    result.reconnect();

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(readOutbox(DRAFT_KEY).map((entry) => entry.content)).toEqual(["written on a train"]);
  });

  it("tells the user when a queued message could not be sent", async () => {
    const send = jest.fn().mockRejectedValueOnce(stillOffline());
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    result.reconnect();

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("positive control — a successful drain empties the queue and shows no error", async () => {
    const send = jest.fn().mockResolvedValue({ id: 1 });
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    result.reconnect();

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(readOutbox(DRAFT_KEY)).toHaveLength(0);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("carries the queued clientKey, so a replayed drain cannot insert the message twice", async () => {
    const send = jest.fn().mockResolvedValue({ id: 1 });
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    const queuedKey = readOutbox(DRAFT_KEY)[0]?.clientKey;
    expect(queuedKey).toEqual(expect.any(String));
    result.reconnect();

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ clientKey: queuedKey }),
    );
  });

  it("does nothing and shows nothing when the queue is empty", async () => {
    const send = jest.fn();
    const result = mountComposer({ isOnline: true, send });

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
