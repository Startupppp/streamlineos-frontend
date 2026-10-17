import { act, renderHook } from "@testing-library/react";
import { useMessageComposer } from "../use-message-composer";

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

const { toast } = jest.requireMock("sonner") as {
  toast: { error: jest.Mock; info: jest.Mock; success: jest.Mock };
};

const CHANNEL_ID = 7;

type ComposerResult = ReturnType<typeof useMessageComposer>;

function mountComposer(options: {
  isOnline: boolean;
  send: jest.Mock;
}): { current: ComposerResult } {
  const { result } = renderHook(() =>
    useMessageComposer({
      channelId: CHANNEL_ID,
      draftKey: `chat:draft:${CHANNEL_ID}`,
      isOnline: options.isOnline,
      sendMessage: { mutateAsync: options.send },
      editMessage: { mutateAsync: jest.fn() },
      markRead: { mutate: jest.fn() },
      scrollToBottom: jest.fn(),
      publishTyping: jest.fn(),
      filteredMentions: [],
    }),
  );
  return result;
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
    expect(result.current.messageQueue.current).toHaveLength(1);
  });
});

describe("draining the offline queue on reconnect", () => {
  it("keeps a message that fails to send, so a failed reconnect cannot discard what the user wrote", async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error("still offline"));
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(result.current.messageQueue.current).toHaveLength(1);
    expect(result.current.messageQueue.current[0]?.content).toBe(
      "written on a train",
    );
  });

  it("tells the user when a queued message could not be sent", async () => {
    const send = jest.fn().mockRejectedValueOnce(new Error("still offline"));
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("positive control — a successful drain empties the queue and shows no error", async () => {
    const send = jest.fn().mockResolvedValue({ id: 1 });
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");

    await act(async () => {
      await result.current.flushMessageQueue();
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.current.messageQueue.current).toHaveLength(0);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("carries the queued clientKey, so a replayed drain cannot insert the message twice", async () => {
    const send = jest.fn().mockResolvedValue({ id: 1 });
    const result = mountComposer({ isOnline: false, send });

    await queueOneOfflineMessage(result, "written on a train");
    const queuedKey = result.current.messageQueue.current[0]?.clientKey;

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
